import { ethers } from 'ethers'
import type { BigNumber } from 'ethers'
import { useContext, useEffect, useState } from 'react'
import Image from 'next/image'
import { MinusCircleIcon } from '@heroicons/react/24/outline'
import { ChainContext } from '@/components/ChainContext'
import { loadTokenData, loadTokenLogo } from '@/lib/load'
import { positionItemStyle as style } from '@/styles/tailwindcss'
import uniswapV2StyleDexERC20 from '../../hardhat/artifacts/contracts/uniswapV2StyleDexERC20.sol/uniswapV2StyleDexERC20.json'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'

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
    const { chainId, signer, getPoolAddress } = useContext(ChainContext)
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
    */

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
                    <div className={style.removeButton}>
                        <MinusCircleIcon className={style.circleIcon}/>
                        Remove
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PositionItem