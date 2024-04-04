import { ethers } from 'ethers'
import { BigNumber } from 'ethers'
import { useContext, useEffect, useState } from 'react'
import { InboxIcon } from '@heroicons/react/24/outline'
import { ChainContext } from '@/components/ChainContext'
import { loadTokenList } from '@/lib/load'
import type { TokenData } from '@/lib/load'
import PositionItem from '@/components/PositionItem'
import type { PositionData } from '@/components/PositionItem'
import { poolStyle as style } from '@/styles/tailwindcss'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'

const Pool = () => {
    const [positions, setPositions] = useState<Map<string, PositionData>>(new Map())  // (※2)
    const { chainId, currentAccount, signer, getPoolAddress } = useContext(ChainContext)
    /** 
     * (※2)
     * ・stringとpositionDataのMapの理由。PositionDataの配列でもよさそうに見える。ただPositionDataをpropsとして渡すPositionItemコンポーネントを後々
     * mapで回す予定だ。となるとkeyが必要なのだが、一意(ユニーク)なkeyをここで作ってしまおうという話。
     * ・PositionDataをstateにしてる理由。UIに表示されるPositionItemコンポーネントの数は提供してる流動性の数によって変化する。(※3)のように流動性があ
     * ればそのデータをMapにどんどんいれる。それを(※4)のようにPositionItemコンポーネントにpropsとして渡しながらmapで回してMapに入ってる数だけ表示する
     * という話。要は流動性の提供数が変化したら都度都度再レンダリングしたいから、ウォレットにコネクトするたびにuseEffectを発火させ(※3)で流動性があるか
     * 判別してstateに入れるようにしてるわけだ。
     * ・Mapオブジェクトとオブジェクトって似てるなと思ったけど出来る出来ないの違いがあるみたいだね。
     * (参考: https://typescriptbook.jp/reference/builtin-api/map#map%E3%81%A8%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AE%E9%81%95%E3%81%84)
    */

    const positionsArray = Array.from(positions.entries())   //(※5)
    positionsArray.sort(function(x, y) { if (x[0] < y[0]) { return -1} return 1 })  // (※6)
    /** 
     * (※5)
     * Mapをentries()してイテレーターオブジェクトにする意味はなんだ...。MapもMap.entries()もArray.from()の返り値同じだよな...。
     * (※6)
     * ・ソートしなかった場合どんな順序になるかというと、tokenListのトークン達を(※7)で取得した順序になる。常に確実に同じ順にする為にソート。
     * ・positionsArrayいじったのにconst 〇〇 = みたいに別の名前に代入してないの違和感あるけど、const foo=[]でfoo.push(1)みたいに変数に代入せず関
     * 数だけ実行しても頭ん中で今fooは[]じゃなくて[1]だって自然に考える、それと同じ。
     * ・そういえばこういうsort内に書いてるのを即時関数という。定義した瞬間に実行される。後で呼び出す作業がいらない。function()｛｝とか()=>｛｝みたいな。
     * function()｛｝は無名関数とも言ったりするよね。


    */

    useEffect(() => {
        const retrievePosition = async function(token0: TokenData, token1: TokenData) {
            const address0 = token0.address
            const address1 = token1.address

            const poolAddress = await getPoolAddress(address0, address1)
            if(poolAddress === undefined) { return }    // (※10)
            const pool = new ethers.Contract(poolAddress, uniswapV2StyleDexPool.abi, signer.provider)
            const liquidity: BigNumber = await pool.balanceOf(currentAccount)

            if(liquidity.gt(0)) {   // (※3)   ここのliquidityのありなしでPositionItemを表示するかしないかが決まる。
                const value = { address0, address1, liquidity }
                setPositions((prevPositions) => {const positions = new Map(prevPositions); positions.set(address0 + address1, value); return positions})
            }
        }
        /** 
         * (※3)
         * ・状態更新関数でMapオブジェクトを更新する時。ここでMapを複製しているのは破壊的メソッドを避けるためのんだろう。new Map(複製したいMapオブジェク
         * ト)で複製できる。こうすれば元のMapオブジェクトを破壊せずに済む。
         * 破壊的メソッドについて。const foo=[]; const bar=foo; bar.push(1); console.log(bar)は[1]。ここで問題なのがconsole.log(foo)も[1]になってし
         * まう。bar===fooほtrue。これはfooを破壊していて良くないから次のようにする。const foo=[]; const bar=[...foo, 1]; console.log(bar)は[1]。
         * だけどconsole.log(foo)は[ ]のまま。bar===fooはfalseでfooは破壊されていない。Mapとか配列みたいな入れたり取り出したりするコレクション系は破壊
         * の可能性があるから気をつけろ。
         * ・prevPositionsにして前の値を使ってる理由は(※7)でくる返しやってるから。
        */

        const retrieveAllPositions = async function(tokenList: TokenData[]) {   // (※7)
            await setPositions(new Map())   // (※1)
            for (let token0 of tokenList ) {
                for (let token1 of tokenList) {
                    if (token0.address < token1.address) {
                        retrievePosition(token0, token1)    // (※9)
                    }
                }
            }
        }
        /** 
         * (※1)
         * ここで初期化する理由。メタマスクのアカウント変えたりしてuseEffectが再び走った時、前のアカウントのpositionsの情報を受け継がないようにするため。
         * 少し話それるが、コネクトウォレットする度に発動してほしいから第二引数にはcurrentAccountとchainIdがある。でもこの2つに変化あったら
         * ChainContext.tsxの(※11)によってページがリロード(stateも初期化)されるからアカウントとchainIdを第二引数に入れる意味ないように思えるけど、そ
         * れはuseEffect内が何も問題なく実行されるのならの話。実際はページのリロード時useEffectはスルーされず計算はされるものの(※8)の条件に該当せず不発
         * に終わる。一方コネクトウォレットボタンを押したときは上手くいく。だから第二引数にはcurrentAccountとchainIdは書く必要がある。
         * 話を戻して、リロードされるなら(※1)は初期値に戻る。つまりこのuseEffectが実行される時は必ずstateのpositionsは初期値だから、わざわざ毎回初期値
         * と同じ値で初期化する意味ないような...。
         * awaitなくていい...
         * 
         * (※9)
         * if文によりtoken0の方がtoken1よりアドレスが小さい。それゆえに(※4)のpropsにもその大小関係を守ったまま渡り、PositionItem.tsxの(※5)もその
         * 大小関係を守っていてaddress0が小さくaddress1が大きい。
        */

        if (currentAccount !== undefined && chainId !== undefined) {   // (※8)
            const tokenList = loadTokenList(chainId)
            retrieveAllPositions(tokenList)
        }
    }, [currentAccount, chainId, signer, getPoolAddress])

    return (
        <div className={style.outerContainer}>
            <div className={style.container}>
                <div className={style.headerContainer}>
                    <div className={style.title}> Pools </div>
                    <div className={style.addLiquidityButtonContainer}>
                        <div className={style.addLiquidityButton}>
                            <div className={style.addLiquidityButtonText}> + Add Liquidity </div>
                        </div>
                    </div>
                </div>
                {/* Positions */}
                <div className={style.positionsContainer}>
                    {(positionsArray.length === 0) ?
                    (<div className={style.positionsDefault}>
                        <InboxIcon className={style.inboxIcon}/>
                        <div> Your positions will appear here. </div>
                    </div>) :
                    (<>{positionsArray.map((pos) => 
                        <PositionItem key={pos[0]} value={pos[1]}/>
                    )}</>)
                    }
                    {/* ↑ここ<></>で囲まないとmapで回したPositionItemタグを表示できない。(※4) */}
                </div>
            </div>
        </div>
    )
}
/** 
 * (※4)
 * <>{positionsArray.map((pos) =>
 *     <PositionItem key={pos[0]} value={pos[1]}/>
 * )}</>
 * 普通の省略記法。
 * 
 * <>{positionsArray.map((pos) => {
 *     <PositionItem key={pos[0]} value={pos[1]}/> }
 * )}</>
 * 省略じゃないのでreturnしないと返らない。(間違ってこうしちゃっててなんも映らなかった)
 * 
 * <>{positionsArray.map((pos) => {
 *     return <PositionItem key={pos[0]} value={pos[1]}/> }
 * )}</>
 * 普通の書き方。
 * 
 * <>{positionsArray.map((pos) => { return
 *     <PositionItem key={pos[0]} value={pos[1]}/> }
 * )}</>
 * セミコロンはしょるとエンジンが自動で挿入する。この場合JavaScriptエンジンは行の終わりで文が終了したとみなしそこにセミコロンを挿入する。
 * 
 * <>{positionsArray.map((pos) => { return (
 *     <PositionItem key={pos[0]} value={pos[1]}/> ) }
 * )}</>
 * JavaScriptエンジンが行末に自動でセミコロンを挿入するのを()で防いだ。
 *  
*/

/** 
 * ・ウォレットをコネクトしてからポジションが列挙されるまでの流れ。
 * コネクトウォレットします(chianIdとcurrentAccountが更新され再レンダリング)→useEffectの第二引数が反応してuseEffectスルーせず実行→トークンデータの全
 * 通りのペアで関数retrievePositionを実行→retrievePositionはliquidityがあったペアのみset関数でpositionsの状態を更新→liquidityがあったペアの数の分
 * stateが更新され、更新回数分再レンダリングがスケジュールされる→Call stackが終わり予約した再レンダリングがされる→positionsArrayが新しい値に再計算さ
 * れ、表示するPositionItemタグの数が決まる。同時にこの時順番もソートされる→PositionItemタグにpropsが渡るとPositionItemコンポーネントが再レンダリン
 * グされる(各PositionItemタグはそのpropsに合わせてUIに表示する内容が変わる)→ PositionItemコンポーネントに渡したpropsが useEffectの第二引数に該当す
 * るのでuseEffectはスルーされず実行→useEffectないのset関数が走りdisplayAmount0,1の状態が更新されPositionItemコンポーネントの再レンダリングが予約さ
 * れる→再レンダリングされdisplayAmount0,1 (つまりbalance)が表示される。
 * 
 * (※4)
 * mapで沢山作ったPositionItemタグはpropsで渡す物が違うから内容も変わって見分けつくから識別するkeyなんて要らなそうだが必要らしい。
 * (参考: https://ja.react.dev/learn/rendering-lists#why-does-react-need-keys)
*/

export default Pool