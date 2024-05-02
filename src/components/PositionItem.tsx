import { ethers, BigNumber } from 'ethers'
import { useContext, useEffect, useState } from 'react'
import { MouseEvent } from 'react'
import Image from 'next/image'
import { MinusCircleIcon } from '@heroicons/react/24/outline'
import { ChainContext } from '@/components/ChainContext'
import TxDialog from '@/components/TxDialog'
import { loadTokenData, loadTokenLogo, loadChainData } from '@/lib/load'
import { positionItemStyle as style } from '@/styles/tailwindcss'
import uniswapV2StyleDexERC20 from '../../hardhat/artifacts/contracts/uniswapV2StyleDexERC20.sol/uniswapV2StyleDexERC20.json'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'
import uniswapV2StyleDexRouter from '../../hardhat/artifacts/contracts/uniswapV2StyleDexRouter.sol/uniswapV2StyleDexRouter.json'
const MAX_INT256 = BigNumber.from(2).pow(256).sub(1)

export interface PositionData {  // (※5)
    address0: string
    address1: string
    liquidity: BigNumber
}
/** 
 * (※5)
 * この3つをproosにしてる理由。このコンポーネントは、トークンペア毎に何個もUIに表示される。そしてそのコンポーネント毎にトークン名とかロゴの表示内容は
 * 違う。トークンペア毎にトークンに合わせて名前とかアイコンを変えるんだから、propsでそこをコントロールしてるってこと。雛形があって、aバージョンしたき
 * ゃpropsにaを、bバージョンにしたきゃpropsにbを、みたいな。
*/

interface PositionItemProps {  //(※6)
    value: PositionData
}
/** 
 * (※6)
 * propsで値を渡すとき3つも書くの面倒くさいからPositionDataをPositionItemPropsにまとめてるのかな。これならvalueの1つで済む。あと、そもそもpropsに
 * 渡す値を(※5)みたいにわざわざ新しく型作って明示してるのは、コード書くときpropsだけだと中に何入ってるっけってなるけど、型決めとけばprops.addressみ
 * たいに書いてるとき分かりやすいよね。まぁpropsの内容覚えているうちに分割代入で書き出して変数に代入しちゃえば良いけども。
*/

const PositionItem = (props: PositionItemProps) => {
    const address0 = props.value.address0
    const address1 = props.value.address1
    const liquidity = props.value.liquidity
    const [displayAmount0, setDisplayAmount0] = useState<string>("")  // (※7)
    const [displayAmount1, setDisplayAmount1] = useState<string>("")
    const [isTxSubmittedOpen, setIsTxSubmittedOpen] = useState<boolean>(false)
    const [isTxConfirmedOpen, setIsTxConfirmedOpen] = useState<boolean>(false)  // (※13)
    const emptyTxInfo = {displayAmount0: '', displayAmount1: '', blockHash: '', transactionHash: ''}  // (※12)
    const [txInfo, setTxInfo] = useState(emptyTxInfo)   //(※11)
    const { chainId, currentAccount, signer, getPoolAddress, routerAddress } = useContext(ChainContext)
    const token0Data = loadTokenData(chainId, address0)!  // (※1)
    const token1Data = loadTokenData(chainId, address1)!
    /** 
     * (※1)
     * ここは絶対"!"。絶対ある。Poolコンポーネントでトークンペアのプールの存在があると確定する事でこのコンポーネントはPoolコンポーネント内で描画されるから。
     * (※7)でdataフォルダーにTokenDataがあることが確定して、(※10)を突破する事でプールの存在が確定する。
     * 
     * (※7)
     * stateにするモチベーション。balanceの値は都度都度変わるからその都度再レンダリングしたい。そしてこれはSwap.tsxの(※5)とかのuseEffectの第二引数とかみ
     * たいに他のstateの更新を誘発するために使われているのではなく、その逆で、他のstateの更新が引き金で発動したuseEffectによって更新される誘発される側の
     * state。
     * 
     * (※11)
     * stateにするモチベーション。txDialogタグで表示する数値や内容は場面に応じて都度変えたいから。因みにswapの時と違い型を定めるのハショッてる。
     * 
     * (※12)
     * displayAmount0: '' じゃなくて displayAmount0 = '' ってしそうになる。
     * obj.a = 1　とか　abj['a'] = 1　とか　abj = {a: 1, b: 2, c: 3}　とかやり方色々。
     * 
     * (※13)
     * stateにするモチベーション。2パターンの何か(今回の場合はtrueとfalse)を使って、一方がpropsに渡るとポップアップが開き、もう一方がpropsに渡るとポッ
     * プアップは表示されない、みたいな事をしたいとき、2パターンの何かをstateにしてしまえば好きなタイミングに状態更新関数を使ってpropsに渡る値をスイッチ
     * 出来る。
    */

    async function handleRemove(e: MouseEvent<HTMLElement>) {
        const success = await sendRemoveTransaction()

        if (success) {
            setDisplayAmount0('0')
            setDisplayAmount1('0')
        }
    }

    async function sendRemoveTransaction(): Promise<boolean> {

        // Step 1. Give allowance
        const poolAddress: string = await getPoolAddress(address0, address1)
        const pool = new ethers.Contract(poolAddress, uniswapV2StyleDexPool.abi, signer)
        const liquidity = await pool.balanceOf(currentAccount)   // propsにあるからこれ不要
        const allowance = await pool.allowance(currentAccount, routerAddress)
        if (liquidity.gt(allowance)) {
            const tx0 = await pool.approve(routerAddress, MAX_INT256).catch((error: any) => {   // (※14)
                console.log('Error while calling pool.approve in handleRemove')
                return false
            })
            await tx0.wait()
        }
        /**
         * (※14) 
         * ・poolのapproveを起動したmsg.senderがどうやって分かるかというと、pool.approveするためにpoolコントラクトを作ったけどその時に引数に渡した
         * signer。このsignerがmsg.sender。このコントラクトを起動してトランザクションを実行するために署名する人。このsignerはコネクトウォレットボタ
         * ン押した時に検出したメタマスクからゲットしたやつ。つまりユーザーのアカウント。UIを操作してるユーザーがmsg.senderにちゃんとなってる。
         * ・ethereumプロバイダーに問い合わせてブロックチェーンに書きこむ(読み取りではなくて)ときはエラーになる可能性もあるからcatch。ユーザーがUI
         * 画面のキャンセルボタンを押したりした時とかかな。書き込まれるまでに時間かかってキャンセルの余地結構あるのかなきっと...
        */

        // Step 2. Call removeLiquidity
        const deadline = Math.floor(Date.now() / 1000) + 120
        const router = new ethers.Contract(routerAddress, uniswapV2StyleDexRouter.abi, signer)

        try {
            const tx = await router.removeLiquidity(address0, address1, liquidity, 0, 0, currentAccount, deadline)
            setTxInfo({
                displayAmount0: '',
                displayAmount1: '',
                blockHash: '',
                transactionHash: tx.hash
            })
            setIsTxSubmittedOpen(true)
            const receipt = await tx.wait()  // (※15)

            //DEBUG
            await new Promise(resolve => setTimeout(resolve, 3000));

            const poolInterface = new ethers.utils.Interface(uniswapV2StyleDexPool.abi)
            const parsedLogs = []
            for (let log of receipt.logs) {
                try {
                    parsedLogs.push(poolInterface.parseLog(log))   // parsedLogs.push(pool.interface.parseLog(log)) でもok
                } catch (e) {}
            }
            const burnEvent = parsedLogs.filter((event: any) => event.name === 'Burn')[0]
            const { sender, amount0, amount1, to } = burnEvent.args
            const decimals0 = token0Data.decimals
            const decimals1 = token1Data.decimals
            const displayAmount0Confirmed = ethers.utils.formatUnits(amount0, decimals0)
            const displayAmount1Confirmed = ethers.utils.formatUnits(amount1, decimals1)
            setTxInfo((prevState) => { return { ...prevState, displayAmount0: displayAmount0Confirmed, displayAmount1: displayAmount1Confirmed, blockHash: receipt.blockHash }})
            setIsTxSubmittedOpen(false)
            setIsTxConfirmedOpen(true)
            return true
        } catch (error: any) {
            console.log('sendRemoveTransaction error', error)
            const code = error?.code
            const reason = error?.reason
            if (code !== undefined && code !== "ACTION_REJECTED" && reason !== undefined) {
                alert(`[Reason for transaction failure] ${reason}`)  // solidity の require で設定したエラー文が出る
            }
            return false
        }
    }

    useEffect(() => {
        const updateDisplayAmount = async function() {
            const poolAddress = await getPoolAddress(address0, address1)  // (※2)
            const pool = new ethers.Contract(poolAddress, uniswapV2StyleDexPool.abi, signer.provider)
            const totalSupply = await pool.totalSupply()
            /** 
             * (※2)
             * Poolコンポーネントでトークンペアのプールの存在があると確定する事でこのコンポーネントはPoolコンポーネント内で描画される。だから絶対ある。
             * ので、if(poolAddress === undefined){}みたいな事はしなくて良い。
            */
            
            const token0Contract = new ethers.Contract(address0, uniswapV2StyleDexERC20.abi, signer.provider)
            token0Contract.balanceOf(pool.address).then((reserve0: BigNumber) => {
                const amount0: BigNumber = (reserve0.mul(liquidity)).div(totalSupply)
                setDisplayAmount0(ethers.utils.formatUnits(amount0.toString(), token0Data.decimals))  // (※4)
            })
            /** 
             * (※3)(※4)
             * (※3)で ! してるおかげで(※4)で token0Data.decimals が possibly 'undefined' にならない。他のtoken0Data.～のとこもならない。
             * 
             * (※4)
             * amount0 でもokだと思うけどなんで amount0.toString() ってしてるんだろ...
             * 文字列だと、数値が非常に大きい場合や正確な精度を維持できる。文字列形式ではJavaScriptの数値型の限界を超える大きな数値をそのままの精度
             * で表現できる。BigNumberオブジェクトは、ethers.jsによって使える大きな数値を正確に扱うためのやつ。これを用いることで大きな数値の演算が
             * 可能。ethers.utils.formatUnits()の第一引数は通常文字列形式またはBigNumber...計算したいならBigNumberにすればくらいの程度なのかな...
            */
    
            const token1Contract = new ethers.Contract(address1, uniswapV2StyleDexERC20.abi, signer.provider)
            token1Contract.balanceOf(pool.address).then((reserve1: BigNumber) => {    // pool.addressでもpoolAddressでもok
                const amount1: BigNumber = (reserve1.mul(liquidity)).div(totalSupply)
                setDisplayAmount1(ethers.utils.formatUnits(amount1.toString(), token1Data.decimals))
            })
        }
        updateDisplayAmount()
    }, [signer, address0, address1, liquidity, getPoolAddress, token0Data.decimals, token1Data.decimals])   // (※8)
    /** 
     * (※8)
     * ・マウント時にも発火する事を忘れずに。
     * ・「この値が変化するとuseEffectをスルーしないよ」というのが第二引数の値なのでこの値が変わったらuseEffectを起動して欲しいって変数を自分で決めちゃえ
     * るけど、こうとも捉えることができる、useEffectが以前と同じ結果を返す事は意味がないので発火するモチベーションにならない、裏を返せばuseEffectが違う
     * 値を返すような状況になったらuseEffectをスルーせず起動したい。そもそもuseEffect内で使われてる変数が変化したらuseEffect内で求めた値も変わる。
     * なのでuseEffect内で使われてる変数全てがuseEffectの第二引数になるのは自然。その時に選ぶ変数だが、useEffect内で定義された変数を選ぶと重複するの
     * でuseEffect外で定義された変数を全て選べば良い。「この」値が変わるとuseEffectで求めた値も変わるよね、の「この」の部分を第二引数に入れればいい。
     * getPoolAddressは変数じゃなくて関数だけど返り値が変わる可能性がある。
    */

    return (
        <div>
            {/* header (logo) */}
            <div className={style.header}>
                <div className={style.pairLogoContainer}>
                    <div> <Image src={loadTokenLogo(chainId, address0)} alt='logo0' height={18} width={18} /> </div>
                    <div className="-ml-2"> <Image src={loadTokenLogo(chainId, address1)} alt='logo1' height={18} width={18} /> </div>
                </div>
                <div className={style.pairTextContainer}>
                    <span>{token0Data.symbol}</span> <span> / </span> <span>{token1Data.symbol}</span>
                </div>
            </div>
            {/* balance, button */}
            <div className={style.balanceContainer}>
                <div className={style.balance}>
                    <div className={style.balanceText}>{token0Data.symbol} Locked Balance: {displayAmount0}</div>
                    <div className={style.balanceText}>{token1Data.symbol} Locked Balance: {displayAmount1}</div>
                </div>
                <div className={style.removeButtonContainer}>
                    {(displayAmount0 === '0' && displayAmount1 === '0') ?
                    (<div className={style.inactiveRemoveButton}>
                        <MinusCircleIcon className={style.circleIcon}/>
                        Remove
                    </div>) :
                    (<div onClick={handleRemove} className={style.removeButton}>
                        <MinusCircleIcon className={style.circleIcon}/>
                        Remove
                    </div>)}
                </div>
            </div>
            {/* Dialogs */}
            <TxDialog
                title="Remove Liquidity Transaction Submitted"
                txURL={`${loadChainData(chainId)?.explorer}/tx/${txInfo.transactionHash}`}
                show={isTxSubmittedOpen}
                onClose={() => setIsTxSubmittedOpen(false)}
            />
            <TxDialog
                title="Transaction Confirmed!"
                message={`${txInfo.displayAmount0} ${token0Data.symbol} and ${txInfo.displayAmount1} ${token1Data.symbol} are sent to your address`}
                txURL={`${loadChainData(chainId)?.explorer}/tx/${txInfo.transactionHash}`}
                show={isTxConfirmedOpen}
                onClose={() => setIsTxConfirmedOpen(false)}
            />
        </div>
    )
}

export default PositionItem