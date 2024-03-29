import { ethers } from 'ethers'
import type { BigNumber, Contract } from 'ethers'  // { ethers } from 'ethers'に含まれないの何故だ...
import { useState, useContext, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowDownIcon } from '@heroicons/react/24/solid'
import { ChainContext } from './ChainContext'
import TokenCombobox from './TokenCombobox'
import { swapStyle as style } from '../styles/tailwindcss'
import { getAmountOut } from '../lib/utilities'
import { loadTokenData } from '../lib/load'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'

export interface TokenField {   //(※3)
    address: string,
    displayAmount: string,
    displayBalance: string,
}
//PoolのaddLiquidityDialogで似た使い方するからそっちにexportしてる。あとTokenComboboxとかでも使ってる。
//exportしたいものをSwapコンポーネント内で記述するとエラーになる、多分。
/*
 - (※3)(※4)
 - (※3)で型を作って(※4)でstateにしてる理由は入力欄とかトークン選択ボックスが「変化」するたびに再レンダリングする仕組みを作りたいから。(※5)のような
 - useEffectの第二引数が良い例だが、値が変わるたびに表示内容を変えたいものは全てStateにしろ、って話。入力内容も出力内容も入力側のトークンの絵も出力側
 - のトークンの絵も、これらは入力やチョイスをする度に変わって欲しい内容。そしてuseEffect内では(※7)みたいに変化後の新しい値で計算される。
*/

const Swap = () => {
    const emptyField: TokenField = {address: '', displayAmount: '', displayBalance: ''}  // :と=で迷ってdisplayAmount=''って書こうとした。
    const [inField, setInField] = useState<TokenField>(emptyField)    // (※4)
    const [outField, setOutField] = useState<TokenField>(emptyField)
    const { chainId, signer, getPoolAddress, getDisplayBalance } = useContext(ChainContext)

    function handleAmountInChange(e: ChangeEvent<HTMLInputElement>) {
        const cleansedDisplayAmountIn: string = e.target.value.replace(/[^0-9.]/g, '')  // 正規表現。数字とドット以外除去。
        setInField((prevState: TokenField) => { return { ...prevState, displayAmount: cleansedDisplayAmountIn }})  // (※2)
    }
    /*
     - (※2)
     - アロー関数の省略記法の内の1つで、関数内のコードが式1つだけの場合は、中カッコ{}とreturnが省略できる。
     - けど戻り値がオブジェクトリテラルの場合は()で囲む必要がある。じゃないと省略した{}なのかオブジェクトの{}なのか分からなくなる。
     - 例 setInField((prevState: TokenField) => ({ ...prevState, displayAmount: cleansedDisplayAmountIn }))
    */
    
    useEffect(() => {
        if ((inField.address !== "") && (outField.address !== "") && (inField.displayAmount !== "") && (inField.address !== outField.address)) { //(※6)
            const updateDisplayAmountOut = async function(addressIn: string, addressOut: string, amountIn: BigNumber, decimalsOut: number) {
                const poolAddress: string | undefined = await getPoolAddress(addressIn, addressOut)
                if (poolAddress === undefined) {
                    alert('Pool does not exist for this token pair')
                } else {
                    const pool = new ethers.Contract(poolAddress, uniswapV2StyleDexPool.abi, signer.provider)
                    const reserve0 = await pool.reserve0()
                    const reserve1 = await pool.reserve1()
                    const [reserveIn, reserveOut] = addressIn < addressOut ? [reserve0, reserve1] : [reserve1, reserve0]
                    //↓関数の引数無しバージョンにして関数内でこう書くのもきっとok
                    //const decimals = loadTokenData(chainId, addressOut)!.decimals     
                    //const amountIn: BigNumber = ethers.utils.parseUnits(inField.displayAmount, decimals)
                    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut)
                    const displayAmount: string = ethers.utils.formatUnits(amountOut, decimalsOut)   // (※9)
                    setOutField((prevState: TokenField) => { return { ...prevState, displayAmount: displayAmount }})
                }
            }
            
            const addressIn = inField.address    // (※7)
            const addressOut = outField.address
            const decimalsIn = loadTokenData(chainId, addressIn)!.decimals  // !について。possibly 'undefined'。
            const decimalsOut = loadTokenData(chainId, addressOut)!.decimals  // !について。possibly 'undefined'。
            let amountIn: BigNumber
            try {
                amountIn = ethers.utils.parseUnits(inField.displayAmount, decimalsIn)
            } catch (e: any) {
                alert(`invalid input: ${e.reason}`)   // どういう時にcatch側になるんだこれ...
                return
            }
            updateDisplayAmountOut(addressIn, addressOut, amountIn, decimalsOut)
        }

        if (inField.displayAmount === "") {
            setOutField((prevState: TokenField) => { return { ...prevState, displayAmount: ""}})  // (※8)
        }
    }, [inField.address, outField.address, inField.displayAmount, chainId, signer, getPoolAddress])  // (※5)
    /** 
     * (※5)
     * ・時間のかかる重い処理を再レンダリング時に毎度再計算したくなくてつまりは第二引数のトリガー条件に引っかかったのみに再計算したいからブロックチェーンに
     * 問い合わせる時間のかかる処理はuseEffect内に記述。
     * ・stateが変わり再レンダリングされる流れについて。トークンを選択し直す、もしくは入力し直す。トークンを選択し直したらトークンコンボボックスの機能が
     * 働き状態更新関数にトークンのアドレスが渡り状態のアドレスフィールドが新しいアドレスに変更され再レンダリング予約される。現在進行してたコード(Call stack)
     * が計算し終わると予約されてた再レンダリングがされコード全体を上から計算し直すが、通常ならスルーしたuseEffectも今回は第二引数が当てはまるのでuseEffect
     * 内も実行。一旦最後までCall stackを計算してからuseEffect内にある予約されてた状態更新関数が発動し再び2回目の再レンダリング。一回目の再レンダリングでは
     * トークン選択箇所のロゴが再描画され、二回目の再レンダリングでは取り出すトークン量表示欄が再描画。入力をし直した場合は、入力するとonChangeにより関数が
     * 発火しその中にある状態更新関数が発動し再レンダリング予約される。現在進行してたコード(Call stack)が計算し終わると予約されてた再レンダリングがされコー
     * ド全体を上から計算し直すが、通常ならスルーしたuseEffectも今回は第二引数が当てはまるのでuseEffect内も実行。一旦最後までCall stackを計算してから
     * useEffect内にある予約されてた状態更新関数が発動し再び再レンダリング。一回目の再レンダリングでは渡すトークン量表示欄が再描画され、二回目の再レンダリ
     * ングでは取り出すトークン量表示欄が再描画、多分。イベントループとか非同期処理辺りのトピック。
     * ・第二引数に記述するものの中に一見関係なさそうな値が入ってる事について。useEffect内の変数(stateとか)が変わったら至極当然だがuseEffect内で更新した
     * set関数の内容も変わる。変わるのであれば、再度set関数で状態を更新して再レンダリングする必要がある。useEffect内で求めた値はuseEffect内の変数による(変
     * 数に依存してる)ので、変数が変わったら必ず再計算する必要がある。だからそーゆー変数は第二引数に当たり前だがいれるだろというわけだ。今回ここで関係な
     * さそうに見えるのはchianIdとgetPoolAddressとsigne。入力内容(inField.displayAmount)とトークン選択(inField.address, outField.address)が変化した
     * 時にこのuseEffect内をスルーせず計算してほしいので、chianIdとgetPoolAddressとsigneは書かなくても良さそうに見える。実際この3つは確実に変化しないか
     * らハショッても問題ない。ただビルド時にESLintが警告してくるから記述してる。
     * 
     * (※6)
     * 元々あった値を空文字にするという変化を避けてる。あとトークンは選択したが数字を入力していないとか。
     * 
     * (※8)
     * useEffectの中に書くと無限レンダリングを避けれる理由。stateが変化するとコンポーネントが再レンダリングされるのが基本。UIが再レンダリングされるつまり
     * コンポーネントを再び上から計算し直す。useEffectの外に書いたら、入力欄が空欄というif文が成立したら中のset関数でstateを更新(変化)するから再び上から
     * 再計算。またif通るからまた中のset関数で…無限。つまり入力欄を空欄にした瞬間無限ループにはまる。しかしuseEffectの中で書くとどうなるか。useEffectは
     * コンポーネントの再レンダリング時に再計算されない部類としてスルーされる。useEffectが発火するのは第二引数が変化した時のみ。再レンダリング時に再び再計
     * 算したくないものはuseEffectにいれると良いという話。
     * ※追記
     * そういえば、そもそもこれをuseEffectの外に書くモチベーションなくない？入力や選択トークンが変わった時に発動して欲しいんだからuseEffectの中に書くでしょ。
     * ※追記
     * いや外に書いてもいい理由はある。入力値が変更されるとuseEffect内もそうだがそもそもコンポーネント全体も再レンダリングされるから、別に外に書いたっていい。
     * ただ、useEffectの第二引数に指定したstate以外のものが変わるたびに計算されるというメモリーや効率面が悪いというだけ。
     * ※追記
     * set関数は値が変更しなくても同じ値を再度代入みたいな意味のない呼び出しでも再レンダリングするんようだ多分。
     * 
     * (※9)
     * 第一引数の型はBigNumberでもstringでもどっちでも多分ok。Ethereumで扱われる値はJavaScriptが安全に表現できる範囲（-2^53 + 1 から 2^53 - 1）を超え
     * ることがよくある。それに対応するためにstringかBigNumberにしてるわけだが、使い分けとしてはおそらく、数値の演算を行う必要がある場合以外はstringでも
     * okみたいな感じだろうか。 ChainContext.tsxの(※12)を参考。
    */

    useEffect(() => {
        if (inField.address !== "") {      // (※12)
            getDisplayBalance(inField.address).then((displayBalance: string) => {    // (※10)
                setInField((prevState: TokenField) => { return { ...prevState, displayBalance: displayBalance}})
            })
        }
        if (outField.address !== "") {
            getDisplayBalance(outField.address).then((displayBalance: string) => {
                setOutField((prevState: TokenField) => { return { ...prevState, displayBalance: displayBalance}})
            })
        }
    }, [inField.address, outField.address, getDisplayBalance])  // (※11)
    /**
     * (※10) 
     * awaitだとその値が返ってくるまでawaitが含まれる関数内のそれ以降の行を計算できないけど、thenならapiに非同期で計算してもらいつつ次の行の計算ができる
     * ってことかな。awaitでも同じ意味の書き方できるけど行が冗長になるからここではthenが楽ってことかな多分。べつに次の74〜78行目の計算を待たせてもいーの
     * ならこの書き方のままawaitでもいーのだろう。
     * 
     * (※11)
     * ・stateが変わり再レンダリングされる流れについて。トークンを選択し直したらトークンコンボボックスの機能が働き状態更新関数にトークンのアドレスが渡り状態
     * のアドレスフィールドが新しいアドレスに変更され再レンダリング予約される。現在進行してたコード(Call stack)が計算し終わると予約されてた再レンダリング
     * がされコード全体を上から計算し直すが、通常ならスルーしたuseEffectも今回は第二引数が当てはまるのでuseEffect内も実行。一旦最後までCall stackを計算
     * してからuseEffect内にある予約されてた状態更新関数が発動し再び2回目の再レンダリング。一回目の再レンダリングではトークン選択箇所のロゴが再描画され、
     * 二回目の再レンダリングではトークン残高が再描画、多分。
     * ・第二引数にgetDisplayBalanceを入れてる理由。getDisplayBalanceの中にstateのchainIdが使われてるわけで、このchainIdはメタマスでネットワークきりか
     * えてコネクトウォレットしたら変わると。したらgetDisplayBalanceの返り値も変わると。getDisplayBalanceの返り値をinField,outFieldのdisplayBalanceに
     * セットしてるんだから、getDisplayBalanceの返り値が変わるのに計算し直さないとか意味わかんないという話。だから第二引数にgetDisplayBalanceを入れて、
     * getDisplayBalanceの返り値が変わったらuseEffectをスルーせず起動するようにしてる。
    */
    
    return(
        <div className={style.outerContainer}>
            <div className={style.container}>
                <div className={style.boxHeader}>
                    <div>Swap</div>
                </div>
                {/* input field */}
                <div className={style.currencyContainer}>
                    <input
                        type='text'
                        className={style.currencyInput}
                        placeholder='0'
                        value={inField.displayAmount}
                        onChange={handleAmountInChange}
                    />
                    <div className={style.currencySelectorContainer}>
                        {/* (※1) */}
                        <div className={style.currencySelector} style={{ zIndex: 1 }}>
                            <TokenCombobox chainId={chainId} setTokenField={setInField} />
                        </div>
                        <div className={style.currencyBalanceContainer}>
                            <div className={style.currencyBalance}>
                                { inField.displayBalance !== "" ? <>{`Balance: ${inField.displayBalance}`}</> : null }
                            </div>
                            {/* ↑は(※12)の条件から「トークンが選択されなきゃ残高は出ない」と言える */}
                        </div>
                    </div>
                </div>
                {/* down arrow box */}
                <div className={style.arrowContainer}>
                    <div className={style.arrowBox}>
                        <ArrowDownIcon className={style.arrowIcon}/>
                    </div>
                </div>
                {/* output field */}
                <div className={style.currencyContainer}>
                    <input
                        type='text'
                        className={style.currencyInput}
                        placeholder='0'
                        disabled={true}
                        value={outField.displayAmount}
                    />
                    <div className={style.currencySelectorContainer}>
                        <div className={style.currencySelector}>
                            <TokenCombobox chainId={chainId} setTokenField={setOutField} />
                        </div>
                        <div className={style.currencyBalanceContainer}>
                            <div className={style.currencyBalance}>
                                {outField.displayBalance !== "" ? <>{`Balance: ${outField.displayBalance}`}</> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
/*
 - (※1)
 - 基本tailwindcssだけどその場しのぎ的にstyleを使ってるんだろう。
 - { zIndex: 1 }はレイヤーの順序を決める類のやつかな多分。どこで恩恵を受けるんだろう...
 - TokenComboboxについて。引数にset関数渡してるけど、addressのみ上書きするのどうやってかというと、
 - TokenComboboxコンポーネントの中でsetTokenField((prevState: TokenField) => {return { ...prevState, address: token.address }})
 - ってちゃんとしてる。
*/

export default Swap