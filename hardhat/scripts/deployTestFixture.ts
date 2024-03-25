import { ethers } from "hardhat"    // hardhatバージョンだからトランザクション時にプロバイダーとか秘密鍵とか不要。

async function addLiquidity(factory, router, token0, token1, units0: number, units1: number, account) {  // (※3)
    const symbol0 = await token0.symbol()
    const symbol1 = await token1.symbol()
    const decimals0 = await token0.decimals()
    const decimals1 = await token1.decimals()

    // Create Pool
    let poolAddress = await factory.getPool(token0.address, token1.address)   // (※5)
    if (poolAddress === ethers.constants.AddressZero) {
        await factory.createPool(token0.address, token1.address)
        poolAddress = await factory.getPool(token0.address, token1.address)
    }
    console.log(`${symbol0}-${symbol1} pool address:`, poolAddress)
    /*
     - (※5)
     - constではなくlet。constはundefinedをうけつけず初期値を必ず定義しなきゃいけないし再代入もできない。
    */

    // Add Liquidity
    const reserve0Before = await token0.balanceOf(poolAddress)
    const reserve1Before = await token1.balanceOf(poolAddress)

    const amount0Desired = ethers.utils.parseUnits(units0.toString(), decimals0); //(※6)のようにparseUnitsの第1引数は数字もstring型
    const amount1Desired = ethers.utils.parseUnits(units1.toString(), decimals1);
    const deadline = Math.floor(Date.now() / 1000) + 120;
    await token0.connect(account).approve(router.address, amount0Desired);
    await token1.connect(account).approve(router.address, amount1Desired);
    await router.connect(account).addLiquidity(
        token0.address, token1.address, amount0Desired, amount1Desired, 0, 0, account.address, deadline
    )

    const reserve0After = await token0.balanceOf(poolAddress)
    const reserve1After = await token1.balanceOf(poolAddress)
    console.log(`${symbol0} reserve changed from ${reserve0Before} to ${reserve0After}`)
    console.log(`${symbol1} reserve changed from ${reserve1Before} to ${reserve1After}`)
}

async function main() {
    const [account0, account1, account2] = await ethers.getSigners();
    
    // Deploy uniswapV2StyleDex
    const Factory = await ethers.getContractFactory("uniswapV2StyleDexFactory");   // (※4)
    const factory = await Factory.deploy()
    await factory.deployed()
    console.log(`factory address: ${factory.address}`);

    const Router = await ethers.getContractFactory("uniswapV2StyleDexRouter");
    const router = await Router.deploy(factory.address);
    await router.deployed();
    console.log(`router address: ${router.address}`);

    // Deploy ERC20 tokens
    const ERC20 = await ethers.getContractFactory("TokenTest")
    const tokenA = await ERC20.deploy("Galleon", "GLN", 18, ethers.utils.parseUnits("100000", 18))  // (※6)
    await tokenA.deployed()
    console.log('GLN address:', tokenA.address)

    const tokenB = await ERC20.deploy("Zenny", "ZNY", 18, ethers.utils.parseUnits("200000", 18))
    await tokenB.deployed()
    console.log('ZNY address:', tokenB.address)

    const tokenC = await ERC20.deploy("USDC", "USDC", 6, ethers.utils.parseUnits("300000", 6))
    await tokenC.deployed()
    console.log('USDC address:', tokenC.address)

    const tokenD = await ERC20.deploy("WBTC", "WBTC", 8, ethers.utils.parseUnits("400000", 8))
    await tokenD.deployed()
    console.log('WBTC address:', tokenD.address)

    // Give tokens to each account
    for (let token of [tokenA, tokenB, tokenC, tokenD]) {
        const decimals = await token.decimals()
        for (let account of [account1, account2]) {
            token.connect(account0).transfer(account.address, ethers.utils.parseUnits("20000", decimals))
        }
    }

    // Create pools for each token pair
    // tokenアドレスの大小関係は tokenD < tokenA < tokenB < tokenC　だから作られるペアは ab da db。
    for (let token0 of [tokenA, tokenB, tokenC, tokenD]) {
        for (let token1 of [tokenA, tokenB]) {   // skip tokenC, tokenD
            if (token0.address < token1.address) {    // (※1)
                for (let account of [account1, account2]) {
                    const units0 = 1000    // human readable amount
                    const units1 = 2000
                    await addLiquidity(factory, router, token0, token1, units0, units1, account)   // (※2)
                }
            }
        }
    }
}
/*
 - (※1)
 - 全組み合わせを出すあるあるなやり方なのかな...この条件式見た時"成る程なぁ～"って思った、確かに全組み合わせ出るなって。
 - Rクラスに背番号を付けた生徒が30人いたとして、二人一組ペアは何通りあるか？みたいな。
 - (※2)
 - 何故ここでawaitしてるんだ..."need await to avoid allowance collision"って理由らしいけどどゆことだ...(※3)の
 - addLiquidity関数の定義の中でawaitしてるから、それが完了する前に(※2)が実行されるのを防ぐためとか？
 - (※4)
 - hardhatネットワークを使う時ここでアカウントを指定しなければデプロイするアカウントはaccount0になる。メインネットやテストネットに
 - デプロイするときはproviderやらSignerの箇所で書いた秘密鍵のアカウントがデプロイするアカウント。
*/

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

/*
 - hardhatネットワークを使ってるからトランザクション時にトークンを支払わずに済んでいる。もしsepoliaテストネットを使ったら
 - Zennyというトークンをデプロイすればsepoliaを消費するし、120Zenny欲しくてミントしたらsepoliaを消費する。
*/