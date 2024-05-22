import { ethers } from "hardhat"

// (※4)-----hardhat版ethersのおかげでハショれる--------
//
// function getRpcUrl(network: string) : string {
//     if (network == "polygon") {
//         return process.env.POLYGON_URL ?? "";
//     } else if (network == "sepolia") {
//         return process.env.SEPOLIA_URL ?? "";
//     } else {
//         return ""
//     }
// }
// (※4)----------------------------------------------

async function main() {
    const [account0] = await ethers.getSigners()   // (※1) ターミナルでネットワークを指定した時に値が決定する
    console.log('account used:', account0.address)   // (※11)
    const chainId = (await account0.provider?.getNetwork())?.chainId    // (※2) ターミナルでネットワークを指定した時に値が決定する

    //(※3)------------hardhat版ethersのおかげでハショれる------------------------------------------------------
    //
    // const privateKey: string = process.env.PRIVATE_KEY ?? "";
    // if (privateKey === "") {
    //     throw new Error('No value set for environement variable PRIVATE_KEY');
    // }
    // const rpcUrl: string = getRpcUrl(network);   // (※8)
    // if (rpcUrl === "") {
    //     throw new Error('No value set for environement variable of network URL');
    // }

    // const provider = new ethers.providers.JsonRpcProvider(rpcUrl);   // (※9)
    // const signer = new ethers.Wallet(privateKey, provider);    // (※10)
    // const chainId = (await provider.getNetwork()).chainId;
    // const option = await getOption(network, signer);

    // const factory = new ethers.ContractFactory(erc20Artifact.abi, erc20Artifact.bytecode, signer);  // (※6)
    // const contract = await factory.deploy(name, symbol, decimals, option);
    //(※3)---------------------------------------------------------------------------------------------------
    
    const Factory = await ethers.getContractFactory("uniswapV2StyleDexFactory")
    const factory = await Factory.deploy()    // (※12)
    await factory.deployed()

    const Router = await ethers.getContractFactory("uniswapV2StyleDexRouter")   // (※7)
    const router = await Router.deploy(factory.address)
    await router.deployed()
    /**
     * hardhat.config.tsの恩恵 
     * ・(※6)の代わりに(※7)と書ける。コントラクトのテストの時みたいにartifactsから必要なもの探してきてくれる。
     * ・(※5)みたいにprogramのoptionでターミナルから記述できる仕組みを手動で作らなくてもターミナルからネットワークの選択を出来るようにしてくれてる。
     * ・さらに(※4)(※8)(※9)みたいにターミナルで指定されたネットワークのプロバイダーを手動で作らなくてok。
     * ・それプラス(※10)みたいにsignerも手動で作らなくてok。
    */

    // JSON data for contracts.json
    console.log(JSON.stringify({chainId, factory: factory.address, router: router.address}))
}

/** 
 * (※1)
 * ・「.env」ファイルに秘密鍵しか記述していないのに await ethers.getSigners();で取得したアカウントオブジェクトから公開鍵を取得できる理由。
 * 秘密鍵から公開鍵を導く方法は分かってるから内部で計算してるのかなきっと...
 * Ethers.jsやHardhatが秘密鍵を使って作ったウォレットオブジェクト(例: new ethers.Wallet(privateKey, provider) とか await ethers.getSigners() )
 * は秘密鍵から公開鍵を導出するメソッドを持ってるのかもしれない(要は(※11)のaccount0.address)。
 * 
 * ・awaitしてる理由。
 * ネットワークにアクセスしてるわけでもないのになぜawaitしているのかなぁと思っていたが、どうやらファイルにアクセスする場合も時間がかかるらしい。とい
 * うことで ethers.getSigners();が内部でファイルシステム(.envファイル)からデータ(秘密鍵)を読み込む必要がある場合、これらの処理は非同期で実行される。
 * ファイルシステムへのアクセスはメモリ操作に比べて遅く、ディスクI/O操作は比較的時間がかかるらしい。
 * 
 * ・「await ethers.getSigners()」と「new ethers.Wallet(privateKey, provider)」が似てる。
 * 「await ethers.getSigners()」で取得するアカウントオブジェクト(signerオブジェクト)と「new ethers.Wallet(privateKey, provider)」で取得するアカ
 * ウントオブジェクト(signerオブジェクト)が似てるなぁって思った。違いは、「await ethers.getSigners()」の場合、複数のアカウントを取得できるとこと
 * hardhat.config.tsで設定したネットワークとアカウントに基づいてsignerオブジェクトが返されるとこ。「new ethers.Wallet(privateKey, provider)」みた
 * いに関数の引数に必要な情報を渡すんじゃなくて、hardhat.config.ts にネットワークの設定やアカウントの情報を記述する。するとHardhatは自動的に適切なプ
 * ロバイダーとアカウントを設定し、ethers.getSigners()で取得できるようになる。多分。
 * 
 * ・(余談)秘密鍵が他人と被らない理由。
 * そういえば秘密鍵ってよく重複しないよな...メタマスクだけが秘密鍵を作ってるなら分かるけど色んなウォレットがあるから、各ウォレット同士作った公開鍵を
 * 共有して調整でもしてるのかなとか思ったけど、重複しない仕組みはもっとおおざっぱで、2^256通りあるから被らんだろうということらしい。加えて秘密鍵を生
 * 成する時に使うランダムな値はマウスの位置とかCPUの時間とかパソコンの色んな値を使ってすごくランダムなんだよという感じらしい。
 * (参考: https://www.bitaddress.org/bitaddress.org-v3.3.0-SHA256-dec17c07685e1870960903d8f58090475b25af946fe95a734f88408cef4aa194.html)
 * 
 * (※2)
 * ・account0.providerについて。
 * (※1)で取得したaccount0はhardhat.config.tsのnetworksのsepolia(polygon)のaccounts(秘密鍵)の事だとおもいそうだけどそうじゃなくて、アカウントオ
 * ブジェクトってイメージだから(コントラクトのテストの時にやったのと同じ)hardhat.config.tsのnetwoksのsepolia(polygon)配下まるっと全部ってイメージ
 * かな...だから(※2)みたいに、account0にプロバイダーがあってそこからchainIdをゲット、みたいなことなんだろう、多分。違いそぉ...
 * ・?について(possibly 'undefined')
 * ターミナルのnetworkオプションで打ち込んだネットワーク名がpolygonでもsepoliaでもない可能性があるし、そもそもhardhat.config.tsや.envにpolygonや
 * sepoliaの情報を記述し忘れてたりする場合もある。だから「possibly 'undefined'」なんだろう。
 * 
 * (※12)
 * polygonのoption
 * polygonにデプロイするからoptionとしてガス代を渡す必要あるかなって思ったけど、不要だった。ERC20のデプロイとmintの時は必要だったのに...何故だ...
*/

/** 
 * 1:「素のethers + 本番ネットワーク」
 * 2:「hardhat版ethers + 本番ネットワーク」
 * 3:「hardhat版ethers + hardhatネットワーク」
 * 4: デプロイしたコントラクトが別のコントラクトをデプロイする場合
 * 上記4パターンでの記述方法の違い(コントラクトのインスタンスの作り方やデプロイ・トランザクション周り)
 * 
 * 1:「素のethers + 本番ネットワーク」----------
 * ・デプロイ
 * ####
 * import artifacts
 * import dotenv(providerとprivatekey)
 * const factory = new ethers.ContractFactory(abi, bytecode, signer)
 * ####
 * -ContractFactoryを使う。
 * -デプロイだからabi・bytecode・signerが必要。
 * -ファイルシステムにアクセスせずデータ渡してその場で作るからawaitではなくてnew。
 * -provider ← rpuUrl、signer ← provider + privatekey
 * 
 * ・トランザクション(view)
 * ####
 * import artifacts
 * import dotenv(provider)
 * const contract = new ethers.Contract(contractAddress, abi, provider);
 * ####
 * -Contractを使う。
 * -viewのトランザクションだからcontractAddress・abi・providerで十分。
 * -ファイルシステムにアクセスせずデータ渡してその場で作るからawaitではなくてnew。
 * 
 * ・トランザクション(write)
 * ####
 * import artifacts
 * import dotenv(providerとprivatekey)
 * const contract = new ethers.Contract(contractAddress, abi, signer);
 * ####
 * -Contractを使う。
 * -writeのトランザクションだからcontractAddress・abi・signerが必要。
 * -ファイルシステムにアクセスせずデータ渡してその場で作るからawaitではなくてnew。
 * -provider ← rpuUrl、signer ← provider + privatekey
 * 
 * 
 * 2:「hardhat版ethers + 本番ネットワーク」----------
 * ####
 * const Factory = await ethers.getContractFactory("hoge")
 * ####
 * -getContractFactoryを使う。
 * -artifactsとhardhat.config.ts見にファイルシステムにアクセスするからawait。
 * -"hoge"とコントラクト名を記述するだけでabiとbytecodeをhardhatがartifactsから取ってきてくれる。
 * -プロバイダーとプライベートキーから作るsignerはhardhatがhardhat.config.tsから作って自動で含めてくれるから手動で作らなくていい。
 * 
 * 
 * 3:「hardhat版ethers + hardhatネットワーク」----------
 * ・通常のパターン
 * ####
 * const Factory = await ethers.getContractFactory("hoge")
 * ####
 * -getContractFactoryを使う。
 * -artifacts見にファイルシステムにアクセスするからawait。
 * "hoge"とコントラクト名を記述するだけでabiとbytecodeをhardhatがartifactsから取ってきてくれる。
 * -プロバイダーとプライベートキーから作るsignerはhardhatネットワーク使うからいらない。
 * 
 * ・プロバイダーの記述が必要なパターン
 * ####
 * const Factory = await ethers.getContractFactory("uniswapV2StyleDexFactory");
 * const factory = await Factory.deploy();
 * await factory.deployed();
 * await factory.createPool(token0.address, token1.address);
 * const poolAddress = await factory.getPool(token0.address, token1.address);
 * const pool = new ethers.Contract(poolAddress, uniswapV2StyleDexPool.abi, ethers.provider);
 * ####
 * -プロバイダーにethers.providerを使う(hardhatネットワーク用のやつなんだろうきっと)。
 * -参考:hardhat/test/uniswapV2StyleDexPool.tsの(※4)
 * 
 * 
 * 4: デプロイしたコントラクトが別のコントラクトをデプロイする場合----------
 * ####
 * import './uniswapV2StyleDexPool.sol'
 * uniswapV2StyleDexPool poolContract = new uniswapV2StyleDexPool{salt: salt}()
 * ####
 * -デプロイ時に、インポートしたsolidityのコントラクトデータごとコンパイルして、abiとかbytecodeはその
 * -コンパイルしたデータから取得してくれるから手動で渡さなくていいんだろう多分。
 * -参考:hardhat/contracts/uniswapV2StyleDexFactory.solの(※1)
*/


//(※5)-------------------------------hardhat版ethersのおかげでハショれる--------------------------------------------------------------
// program
//     .addOption(new Option('--network <string>', 'name of blockchain network(e.g. polygon, sepolia)').choices(['polygon', 'sepolia']).makeOptionMandatory())
// const options = program.opts()
//(※5)------------------------------------------------------------------------------------------------------------------------------


main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

/** 
 * package.jsonのscriptsの"hardhat compile"が"npx hardhat compile"じゃない件について。
 * hardhatがプロジェクトのnode_modules/.binディレクトリにインストールされている場合、npxを使用しなくても直接コマンドを実行できるらしい。
 * つまり、npm install --save-dev hardhat のコマンドを実行してhardhatをプロジェクトにインストールしておく必要がある。
 * "compile": "npx hardhat compile" は、npxを使ってhardhatコマンドを実行。"compile": "hardhat compile" は、プロジェクト内にインスト
 * ールされているhardhatコマンドを直接実行。
*/