import { ethers } from 'ethers'
import type { BigNumber } from 'ethers'  // { ethers } from 'ethers'に含まれないの何故だ...
import { useState, useContext, useEffect } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { ArrowDownIcon } from '@heroicons/react/24/solid'
import { ChainContext } from './ChainContext'
import TokenCombobox from './TokenCombobox'
import TxDialog from './TxDialog'
import { loadChainData, loadTokenData } from '@/lib/load'
import { getAmountOut } from '@/lib/utilities'
import { swapStyle as style } from '@/styles/tailwindcss'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'
import uniswapV2StyleDexRouter from '../../hardhat/artifacts/contracts/uniswapV2StyleDexRouter.sol/uniswapV2StyleDexRouter.json'

export interface TokenField {   //(※3)
    address: string,
    displayAmount: string,
    displayBalance: string,
}
//PoolのaddLiquidityDialogで似た使い方するからそっちにexportしてる。あとTokenComboboxとかでも使ってる。
//exportしたいものをSwapコンポーネント内で記述するとエラーになる、多分。
/*
 - (※3)(※4)
 - ・(※3)で型を作って(※4)でstateにしてる理由は入力欄とかトークン選択ボックスが「変化」するたびに再レンダリングする仕組みを作りたいから。(※5)のような
 - useEffectの第二引数が良い例だが、値が変わるたびに表示内容を変えたいものは全てStateにしろ、って話。入力内容も出力内容も入力側のトークンの絵も出力側
 - のトークンの絵も、これらは入力やチョイスをする度に変わって欲しい内容。そしてuseEffect内では(※7)みたいに変化後の新しい値で計算される。
 - ・enum Statusの2番目の状態から3番目の状態になるきっかけはボタンを押すことによって発火する関数だが、1番目から2番目になるきっかけはuseEffectを利用し
 - てるので入力欄に入力する事がきっかけになってる。その後useEffect内で関数が発火する。どちらも関数を発火してその関数内にある状態更新関数で状態を変化させ
 - てるが、ボタンのonClickで直接関数を発火させるか、入力欄に入力するとuseEffectの第二引数が反応してその後useEffect内で関数を発火させるかという、
 - useEffectを挟むか挟まないかという最初のきっかけが違う。
*/

export interface TxInfo {
    symbolIn: string
    symbolOut: string
    displayAmountIn: string
    displayAmountOutRequested: string
    displayAmountOutConfirmed: string
    blockHash: string
    transactionHash: string
}

enum Status {
    WAIT_FOR_INPUT,
    NEED_APPROVAL,
    READY_TO_SUBMIT
}

const Swap = () => {
    const emptyField: TokenField = {address: '', displayAmount: '', displayBalance: ''}  // :と=で迷ってdisplayAmount=''って書こうとした。
    const [inField, setInField] = useState<TokenField>(emptyField)    // (※4)
    const [outField, setOutField] = useState<TokenField>(emptyField)
    const [status, setStatus] = useState<Status>(Status.WAIT_FOR_INPUT)
    const [isTxSubmittedOpen, setIsTxSubmittedOpen] = useState<boolean>(false)
    const [isTxConfirmedOpen, setIsTxConfirmedOpen] = useState<boolean>(false)
    const emptyTxInfo: TxInfo = { symbolIn: '', symbolOut: '', displayAmountIn: '', displayAmountOutRequested: '', displayAmountOutConfirmed: '', blockHash: '', transactionHash: ''}
    const [txInfo, setTxInfo] = useState<TxInfo>(emptyTxInfo)
    const { chainId, signer, currentAccount, getPoolAddress, getDisplayBalance, getAllowance, sendApprovalTransaction, routerAddress } = useContext(ChainContext)

    function handleAmountInChange(e: ChangeEvent<HTMLInputElement>) {  // この型の知り方が分からない...
        const cleansedDisplayAmountIn: string = e.target.value.replace(/[^0-9.]/g, '')  // 正規表現。数字とドット以外除去。
        setInField((prevState: TokenField) => { return { ...prevState, displayAmount: cleansedDisplayAmountIn }})  // (※2)
    }
    /*
     - (※2)
     - アロー関数の省略記法の内の1つで、関数内のコードが式1つだけの場合は、中カッコ{}とreturnが省略できる。
     - けど戻り値がオブジェクトリテラルの場合は()で囲む必要がある。じゃないと省略した{}なのかオブジェクトの{}なのか分からなくなる。
     - 例 setInField((prevState: TokenField) => ({ ...prevState, displayAmount: cleansedDisplayAmountIn }))
    */

    async function handleApproval(e: MouseEvent<HTMLElement>) {   // この型の知り方が分からない...
        const success: boolean = await sendApprovalTransaction(inField.address)  // (※19)
        if (success) {
            setStatus(Status.READY_TO_SUBMIT)
        }
    }

    async function handleSubmit(e: MouseEvent<HTMLElement>) {
        const success = await sendSwapTransaction()  // (※20)
        if (success) {
            setInField(prevState => { return { ...prevState, displayAmount: ''}})   // (※14)
            setStatus(Status.WAIT_FOR_INPUT)
            //setOutField(emptyField)  　　←　setInFieldが空になったらuseEffectでsetOutFieldも空になるからこれ要らない。
        }
    }
    /** 
     * (※14)
     * トランザクションが完了した後は入力欄は空欄になって欲しいが、トランザクション後のトークンのバランス見たいからトークンは選択しっぱなしでok。
     * setInField(emptyField)にしない事。
     * 
     * (※19)(※20)
     * (※19)の関数の中にはContextで定義した関数が記述されてるが(※20)の関数の中にはSwapコンポーネント内で定義した関数が記述されてる。(※19)の
     * 中で使ってる関数はPoolコンポーネントでも使うのでContextに記述しどのコンポーネントでも使えるようにしたかった。一方(※20)の中で使ってる関数はPool
     * コンポーネントで使う予定はないのでContextを利用して共有する必要がない。
    */

    async function sendSwapTransaction(): Promise<boolean> {   // (※18)
        const addressIn = inField.address
        const addressOut = outField.address
        const decimalsIn = loadTokenData(chainId, addressIn)!.decimals   // !について。possibly 'undefined'。
        // const decimalsOut = loadTokenData(chainId, addressOut)!.decimals  // !について。possibly 'undefined'。
        const amountIn = ethers.utils.parseUnits(inField.displayAmount, decimalsIn)
        const amountOutMin = 0
        const to = currentAccount
        const deadline = Math.floor(Date.now() / 1000) + 120
        const router = new ethers.Contract(routerAddress, uniswapV2StyleDexRouter.abi, signer)

        try {
            const tx = await router.swapTokenPair(addressIn, addressOut, amountIn, amountOutMin, to, deadline)  // (※15)

            setTxInfo({
                symbolIn: loadTokenData(chainId, inField.address)!.symbol,    // !について。possibly 'undefined'。
                symbolOut: loadTokenData(chainId, outField.address)!.symbol,   // !について。possibly 'undefined'。
                displayAmountIn: inField.displayAmount,         // txInfo.displayAmountIn と inField.displayAmount はイコール。
                displayAmountOutRequested: outField.displayAmount,
                displayAmountOutConfirmed: '',
                blockHash: '',
                transactionHash: tx.hash
            })

            setIsTxSubmittedOpen(true)

            //DEBUG
            await new Promise(resolve => setTimeout(resolve, 3000))  // hardhatネットワーク用の3秒待機

            const receipt = await tx.wait()   // (※16)
            const poolInterface = new ethers.utils.Interface(uniswapV2StyleDexPool.abi)
            const parsedLogs = []
            for(let log of receipt.logs) {
                try {
                    parsedLogs.push(poolInterface.parseLog(log))  // (※23)
                } catch (e) {}  // LogFeeTransfer event in Polygon cannot be parsed with the ABI
            }
            const swapEvent = parsedLogs.filter((event: any) => event.name === 'Swap')[0]
            const [sender, amount0In, amount1In, amount0Out, amount1Out] = swapEvent.args
            const amountOut = amount0In.isZero() ? amount0Out : amount1Out
            const decimalsOut = loadTokenData(chainId, outField.address)!.decimals   // !について。possibly 'undefined'。
            const displayAmountOut = ethers.utils.formatUnits(amountOut, decimalsOut)
            setTxInfo((prevState) => { return { ...prevState, blockHash: receipt.blockHash, displayAmountOutConfirmed: displayAmountOut }})

            setIsTxSubmittedOpen(false)
            setIsTxConfirmedOpen(true)

            return true
        } catch (error: any) {
            console.log('sendSwapTransaction err', error)
            const code = error?.code
            const reason = error?.reason
            if (code !== undefined && code !== "ACTION_REJECTED" && reason !== undefined) {
                alert(`[Reason for transaction failure] ${reason}`)   // (※22)
            }
            return false
        }
    }
    /** 
     * (※15)(※16)
     * (※15)でawaitし忘れて訳わかんなくなった。router.swapTokenPairのトランザクションの実行を待たず(メタマスクで確認ボタンを押す前)に
     * setIsTxSubmittedOpenのダイアログが表示された。おまけにsetIsTxConfirmedOpenダイアログが表示されなかった。多分(※16)で tx.wait() しようにも
     * (※15)でawaitしてtx受け取ってないから、「txってなんやねん」ってなって計算が止まったのかもしれない。
     * 
     * (※16)
     * deploy()はトランザクションがブロックチェーンに送られるのを待つ。deployed()はブロックチェーンに書き込まれるのを待つ。つまりブロックチェーンの外
     * からのアクション。一方wait()は既にブロックチェーンに書き込まれた関数を起動するわけなので、deploy()のようなトランザクションがブロックチェーンに
     * 送られるのを待つというプロセスは無く、deployed()のようにブロックチェーンに書き込まれるのを待つというのしかない。waited()というのはなくwait()の
     * み。だよな...
     * 
     * (※18)
     * 今現在進行形のコードが最後まで計算されてからコンポーネントの再レンダリングが行われると思っていた。ただ今回の場合はそれだと上手く説明ができない。
     * まず今回の再レンダリングまでの流れを先に言うと、Swapボタン押すとonClickによってhandleSubmit関数が発火します。その中にはsendSwapTransaction関
     * 数があるのでそれが発火します。sendSwapTransaction関数の中身がこうだ。トランザクションデータのstateを変更→メッセージウィンドウAの表示のstateを
     * onに変更→トランザクションデータのstateをさらに変更→メッセージウィンドウAの表示のstateをoffにしてメッセージウィンドウBの表示のstateをon。つまり
     * 、関数が走り切ってから再レンダリングしてては遅いのだ。関数が走りながら並行して再レンダリングをしていかなきゃいけないのだ。stateの変更をバッチして
     * 溜め込んで、現在進行形の計算が終了したからstateの変更を再レンダリングするというやりかたでは、state変更とstate変更の間にある3秒待つなんていうコー
     * ドがバッチに一緒に溜んで無い限りなりたたない。そもそもメッセージウィンドウの存在理由を考えるとだ、メッセージウィンドウは「いまトランザクション送
     * ってるよ」っていう計算途中の間に表示することが今回の役目。おそらく、スケジュールした MicroTask のなかには現在進行中の Call Stack の中にawaitの
     * ような非同期処理があったらそれよりも優先して実行してしまうものがあるのだろう、多分。今回の場合でいうと、ブロックチェーンへのトランザクションを待
     * ってる間TxInfoとダイアログの再レンダリングがブロックチェーンのトランザクションを含む Call Stack を待たずに実行される。推測では、ブロックチェー
     * ンに問い合わせる場合、そこで使われるAPIの使用で、ブロックチェーンから値を取得する前にその段階のCall StackとMicrotask Queuとその他のタスクキュ
     * ーを一旦終わらせレンダリングを済ませてしまうのではないだろうか。その後API側で非同期で計算した値をゲットしたら途中からまたコードを計算するとか。
     * もしくは、headlessUIを使用するとブラウザのAPIは即座に再レンダリングをするよう促すとか。
     * 
     * (※22)
     * solidityで実装したコントラクト、そこのrequireで設定したエラー文が出る。
     * 出力内容 → [Reason for transaction failure] Error: VM Exception while processing transaction: reverted with reason string
     * 'uniswapV2StyleDexRouter: POOL_DOES_NOT_EXIST'
     * 
     * (※23)
     * FactoryコントラクトのテストuniswapV2StyleDexFactory.tsの(※3)ように、poolコントラクトのインスタンス作って
     * parsedLogs.push(pool.interface.parseLog(log)) としてもok。
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
                    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut)   // (※21)
                    const displayAmount: string = ethers.utils.formatUnits(amountOut, decimalsOut)   // (※9)
                    setOutField((prevState: TokenField) => { return { ...prevState, displayAmount: displayAmount }})
                }
            }
            /** 
             * (※21)
             * outFieldのdisplayAmountはユーザーがUIで確認する暫定の値。txInfoの amountOutConfirmed が実際の値。
            */

            const checkAllowance = async function(addressIn: string, amountIn: BigNumber) {     // async function 名前(){} の書き方エラーになる
                const allowance = await getAllowance(addressIn)
                if (allowance.lt(amountIn)) {
                    setStatus(Status.NEED_APPROVAL)   // (※17)
                } else {
                    setStatus(Status.READY_TO_SUBMIT)
                }
            }
            /** 
             * 関数の定義を関数の実行と勘違いしてる時がある。ここは関数を定義してるだけ、まだ発火してない。下の方で発火する。
            */
            
            const addressIn = inField.address    // (※7)
            const addressOut = outField.address
            const decimalsIn = loadTokenData(chainId, addressIn)!.decimals  // !について。possibly 'undefined'。
            const decimalsOut = loadTokenData(chainId, addressOut)!.decimals  // !について。possibly 'undefined'。
            let amountIn: BigNumber
            try {
                amountIn = ethers.utils.parseUnits(inField.displayAmount, decimalsIn)
            } catch (e: any) {
                alert(`invalid input: ${e.reason}`)   // どういう時にcatch側になるんだこれ...パース出来ないってどんな時だ...
                return
            }
            updateDisplayAmountOut(addressIn, addressOut, amountIn, decimalsOut)
            checkAllowance(addressIn, amountIn)
        }

        if (inField.displayAmount === "") {
            setOutField((prevState: TokenField) => { return { ...prevState, displayAmount: ""}})  // (※8)
        }
    }, [inField.address, outField.address, inField.displayAmount, chainId, signer, getPoolAddress, getAllowance])  // (※5)
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
     * ・useEffectはマウント時にも発火する事を忘れるな。(厳密には、第二引数に空配列を渡すとどうのこうの)
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
        if(inField.address !== "" && inField.address === outField.address) {
            setTimeout(() => { alert("Pleace select a defferent token") }, 0)  // alert("Pleace select a defferent token")だけで良いよな,,,
            return   // 条件に当てはまったらこの先計算不要だからreturnしちゃう。という事でuseEffect内の上の方に記述してる。
        }

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
    }, [inField.address, outField.address, getDisplayBalance, isTxConfirmedOpen])  // (※11)
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
                            {/* ↑は(※12)の条件から「トークンが選択されなきゃ残高は表示しない」と言える */}
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
                {/* buttons for each status */}
                <div>
                    {status === Status.WAIT_FOR_INPUT ?
                        (<div className={style.inactiveConfirmButton}>
                            swap
                        </div>) : null }
                    {status === Status.NEED_APPROVAL ?
                        (<><div onClick={handleApproval} className={style.confirmButton}>
                            {`Allow to use your ${loadTokenData(chainId, inField.address)?.symbol} (one time approval)`}
                        </div>
                        {/* ?。possibly 'undefined'↑ */}
                        <div className={style.inactiveConfirmButton}>
                            swap
                        </div></>) : null }
                    {status === Status.READY_TO_SUBMIT ?
                        (<div onClick={handleSubmit} className={style.confirmButton}>
                            swap
                        </div>) : null }
                </div>
                <TxDialog
                    title='Swap Transaction submitted'
                    txURL={`${loadChainData(chainId)?.explorer}/tx/${txInfo.transactionHash}`}  // ?について。possibly 'undefined'。
                    show={isTxSubmittedOpen}
                    onClose={() => setIsTxSubmittedOpen(false)}
                />
                <TxDialog
                    title='Transaction Confirmed!'
                    message={`${txInfo.displayAmountIn} ${txInfo.symbolIn} swapped to ${txInfo.displayAmountOutConfirmed} ${txInfo.symbolOut}`} //(※13)
                    txURL={`${loadChainData(chainId)?.explorer}/tx/${txInfo.transactionHash}`}   // ?について。possibly 'undefined'。
                    show={isTxConfirmedOpen}
                    onClose={() => setIsTxConfirmedOpen(false)}
                />
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
 -
 - (※13)
 - ${txInfo.displayAmountIn} は ${inField.displayAmount} でもok。
*/
/** 
 * stateと再レンダリング周辺の雑メモ。
 * レンダリングはstateに変更があったら直ちに変更せず変更をするよって予約する。んで現在進行形のCall stackが終わったら予約してたstateの変更をコード
 * 全体(useEffectとかはスルーして)に反映して上から再計算して仮想DOMを全体を1から作り直す。そして仮想DOMとリアルDOMの差分のみ変更してUIに描画される。
 * stateにしたい物。簡単な例だとstateに、直接UIに表示したいものをあてがう。けどもし単純な数字とかを表示したいわけではなく、ここがこうなったらこっちパター
 * ンを表示、ここがああなればあっちパターンを表示、みたいにしたいのであれば変わった使い方になる。表示したい物を直接stateにあてがうのではなく、表示したいも
 * のはパターン別に用意しといて、stateの状態変化にあわせて表示するやつを切り替えるみたいにする。--1:例えば、stateがAの時条件がtrueになって三項演算子のこのパ
 * ターンが表示されて、stateがBの時はこっちの条件がtrueになってこっちのパターンが表示されるみたいな。どっかの「ボタン」が押されたらonClick関数でstateをA
 * からBに書き換えて、Aだったら三項演算子ではfalse側だったけどBになったらその三項演算子のtrue側になって三項演算子の中のdivタグの表示がfalseのものからtrue
 * のものに切り替わる、みたいな。--2:他の例としては、useEffectの第二引数にstateを入れるパターン。入力する(とかトークンを選択する)度にinputタグに入れた関数
 * が動く。んでその関数内でsetStateで入力内容を保存するstateを変化させる。そのstateをuseEffectの第二引数にいれると、入力する度にuseEffectが作動する流れが
 * できる。なぜなら、入力するとstateが変化して、そのstateはuseEffectの第二引数だから、stateが変化するってことはuseEffectを作動させる事になる。その
 * useEffect内で別の表示切替stateをsetStateで更新するコードを書く。このuseEffect内の表示切替stateは記号AかBかCかを保存するstateで、jsxの中でAならこの
 * divタグを表示、Bならこれ、みたいに三項演算子をつかって表示切り替えにつかってる。するとこんな流れになる。文字を入力→input→関数→入力内容をstateAに反映→再
 * レンダリングにより他の箇所のstateAに反映かつ上からコードを再計算→useEffectが第二引数のstateAが変化してる事を感知してuseEffect内が発火→useEffect内の
 * stateBが条件分岐などで更新→再レンダリングにより他の箇所のstateBに反映かつ上からコードを再計算→jsx内にあるstateBが変化したので三項演算子によりべつの
 * divタグがUIに表示されるいい例としては(※17)。１個目の例では、「ボタン」をおしたらonClickにわたした関数が動く。んでその関数内にはif文とかあってこうだっ
 * たらif文スルーだけどああだったらstateをBにするみたいにstateが切り替わる。state変化したから再レンダリング。んで他の箇所のstateが切り替わったらjsxの中に
 * 書いてたstateがAだったらこっちだけどstateがBだったらあっちになるってのが三項演算子によって切り替わってそれがUIに表示される。こんな流れ。ボタン→
 * onClick→関数→関数内の条件分岐でstate変化→再レンダリングで他の箇所のstateにも反映かつ上からコードを再計算→jsx内にあるstateによって表示を場合分けして
 * た三項演算子がstateの変化をくんで表示内容が変わる。※追記--3:個目の例。トークンコンボボックスで選んだトークンをset関数に毎度登録しなかったら、再レンダ
 * リングされずトークンロゴが表示されない。--4:(※12)。トークンコンボボックスによって状態がsetされてれば(空欄でなければ)〇〇を実行。setされてなきゃ(空欄
 * なら)〇〇はスルー。表示が切り替わるものは、その表示のパターン別に条件分岐によく使われる。
 * 
 * トークンをデプロイとかするとトランザクションのガス代に使われるトークンが何だっけってなるよね。
 * zenyをsepoliaにデプロイしたらメタマスクから0.024sepolia減った。zenyをミントしたらメタマスクから0.001sepolia減って、1.23zenyゲットした。zenyのデプ
 * ロイとzenyのミントも使われるガスはsepolia。スタンドアロンのhardhatネットワークの場合、ETHが20個のアカウントに100万ずつくらい配られる。GLNをデプロイ
 * するときもミントするときも消費されるのは最初に貰ったETH。
 * 
 * balance以上の値をswapしようとしても何も起きないのは多分swapTokenPairの中のtransferFromの中のreqireではじかれるから。
*/

export default Swap