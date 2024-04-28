import { ethers, BigNumber } from 'ethers'
import { useState, useContext, useEffect } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ChainContext } from '@/components/ChainContext'
import { loadTokenData, loadChainData } from '@/lib/load'
import type { TokenData } from '@/lib/load'
import type { TokenField } from '@/components/Swap'
import TokenCombobox from '@/components/TokenCombobox'
import TxDialog from './TxDialog'
import { AddLiquidityStyle as style } from '@/styles/tailwindcss'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'
import uniswapV2StyleDexRouter from '../../hardhat/artifacts/contracts/uniswapV2StyleDexRouter.sol/uniswapV2StyleDexRouter.json'
import uniswapV2StyleDexERC20 from '../../hardhat/artifacts/contracts/uniswapV2StyleDexERC20.sol/uniswapV2StyleDexERC20.json'


interface addLiquidityDialogProps {
    show: boolean
    onClose: () => void
}

const AddLiquidityDialog = (props: addLiquidityDialogProps) => {
    const {show, onClose} = props   // (※7)
    const emptyField: TokenField = { address: '', displayAmount: '', displayBalance: '' }
    const [AField, setAField] = useState<TokenField>(emptyField)
    const [BField, setBField] = useState<TokenField>(emptyField)
    const [isNewPair, setIsNewPair] = useState<boolean>(false)    // (※1)
    const [isFilled, setIsFilled] = useState<boolean>(false)
    const [hasAllowanceA, setHasAllowanceA] = useState<boolean>(false)
    const [hasAllowanceB, setHasAllowanceB] = useState<boolean>(false)
    const [isTxSubmittedOpen, setIsTxSubmittedOpen] = useState<boolean>(false)
    const [isTxConfirmedOpen, setIsTxConfirmedOpen] = useState<boolean>(false)
    const emptyTxInfo = { symbolA: '', symbolB: '', displayAmountDepositedA: '', displayAmountDepositedB: '', blockHash: '', transactionHash: '' }
    const [txInfo, setTxInfo] = useState(emptyTxInfo)
    const { chainId, signer, currentAccount, getPoolAddress, getDisplayBalance, getAllowance, sendApprovalTransaction, routerAddress } = useContext(ChainContext)
    /** 
     * (※1)
     * stateにするモチベーション。2パターンの何か(今回の場合はtrueとfalse)をstateにすると、好きなタイミングに状態更新関数を使ってスイッチみたいに使
     * える。何かを表示するかしないかをコントロールしたい。表示するかしないかというのは2択なので、trueなら〇〇を表示、falseなら〇〇は非表示、ってでき
     * る。ならstateの型をbooleanにして、そのstateを何らかのきっかけ(ボタンのonClickとかuseEffectの第二引数とかif文内とか)でset関数を発動させ切り
     * 替えるようにすれば良い。ここの場合は、useEffectの中のif文の中で「プールのアドレスが無かったらset関数でstateをtrueに、あったらfalseに」してる。
     * そしてそのbooleanのstateをinputタグのdisabledオプションに渡してる(disabledは trueだと入力不可、falseなら入力可)。
    */

    function closeAndCleanUp() {
        onClose()   // (※4)
        setAField(emptyField)
        setBField(emptyField)
        setIsNewPair(false)
        setIsFilled(false)
        setHasAllowanceA(false)
        setHasAllowanceB(false)   //(※12)
    }
    /** 
     * (※4)
     * このonCloseはこのコンポーネントにpropsで渡ってきたisOpenのset関数setIsOpen(false)。isOpenもこのコンポーネントにpropsで渡ってきていて(※3)で
     * 使われている。(※3)のshow に ture を渡すとこのコンポーネントは表示される。onCloseが実行されるとisOpenが更新されisOpenを使ってるこのコンポーネ
     * ントは再レンダリングされる。そして(※3)のshowがfalseになるから結果このコンポーネントは閉じる。
    */

    function handleAmountAChange(e: ChangeEvent<HTMLInputElement>) {
        const cleansedDisplayAmountA = e.target.value.replace(/[^0-9.]+/g, '')
        setAField((prevState: TokenField) => { return { ...prevState, displayAmount: cleansedDisplayAmountA }})
    }

    function handleAmountBChange(e: ChangeEvent<HTMLInputElement>) {
        const cleansedDisplayAmountB = e.target.value.replace(/[^0-9.]+/g, '')  // (※5)
        setBField((prevState: TokenField) => { return { ...prevState, displayAmount: cleansedDisplayAmountB }})
    }
    /** 
     * (※5)
     * /[^0-9.]+/g と /[^0-9.]/g の違い。どちらも結果は同じである。 + 記号は「1回以上の繰り返し」を意味する。この場合は数値とピリオド以外の文字が1回
     * 以上連続している場合にマッチする。例えば abc123.45def と入力されたら + がある場合 abc と def が連続する非数値・非ピリオド文字列としてマッチし,
     * + がない場合各非数値・非ピリオド文字（a, b, c, d, e, f）が個別にマッチする。最終結果は同じだけど、+ がある場合は処理効率が良くなる。なぜなら、
     * 連続する非数値・非ピリオド文字列を一度にマッチさせて削除できるから。+ がないと、文字列中の各非マッチ文字に対して個別の処理が必要になり、文字列が
     * 長くなるほど処理時間が増加する可能性がある。
    */

    async function handleApproval(e: MouseEvent<HTMLElement>, address: string, setterBoolean: React.Dispatch<React.SetStateAction<boolean>>) {
        const success: boolean = await sendApprovalTransaction(address)
        if (success) {
            setterBoolean(true)
        }             //successがfalseだった時のエラー文をelseで書くとどっかのエラー文と重複するかな...
    }

    async function handleAdd(e: MouseEvent<HTMLElement>) {
        const success = await sendAddTransaction()
        if (success) {
            closeAndCleanUp()   // (※9)
        }             //successがfalseだった時のエラー文をelseで書かなくてもsendAddTransaction内で警告だしてる
    }

    async function sendAddTransaction(): Promise<boolean> {
        const addressA = AField.address
        const displayAmountA = AField.displayAmount
        const symbolA = loadTokenData(chainId, addressA)!.symbol     // !について。possibly 'undefined'。
        const decimalsA = loadTokenData(chainId, addressA)!.decimals     // !について。possibly 'undefined'。
        const tokenA = new ethers.Contract(addressA, uniswapV2StyleDexERC20.abi, signer)
        const amountADesired = ethers.utils.parseUnits(displayAmountA, decimalsA)

        const addressB = BField.address
        const displayAmountB = BField.displayAmount
        const symbolB = loadTokenData(chainId, addressB)!.symbol     // !について。possibly 'undefined'。
        const decimalsB = loadTokenData(chainId, addressB)!.decimals     // !について。possibly 'undefined'。
        const tokenB = new ethers.Contract(addressB, uniswapV2StyleDexERC20.abi, signer)
        const amountBDesired = ethers.utils.parseUnits(displayAmountB, decimalsB)

        const deadline = Math.floor(Date.now() / 1000) + 120
        const router = new ethers.Contract(routerAddress, uniswapV2StyleDexRouter.abi, signer)

        try {
            const tx = await router.addLiquidity(tokenA.address, tokenB.address, amountADesired, amountBDesired, 0, 0, currentAccount, deadline)
            setTxInfo({
                ...emptyTxInfo,
                symbolA,
                symbolB,
                transactionHash: tx.hash
            })
            setIsTxSubmittedOpen(true)

            // DEBUG
            await new Promise(resolve => setTimeout(resolve, 3000));

            const receipt = await tx.wait()
            const poolInterface = new ethers.utils.Interface(uniswapV2StyleDexPool.abi)
            const poolAddress = await getPoolAddress(addressA, addressB)
            const parsedLogs = receipt.logs     // (※8) logにして2個目のダイアログでなかった
                .filter((log: any) => log.address.toLowerCase() === poolAddress.toLowerCase())
                .map((log: any) => poolInterface.parseLog(log))
            const MintEvent = parsedLogs.filter((event: any) => event.name === 'Mint')[0]
            const [sender, amount0, amount1] = MintEvent.args  // (※6)[]と{}どっち
            const [amountDepositedA, amountDepositedB] = addressA < addressB ? [amount0, amount1] : [amount1, amount0]
            const displayAmountDepositedA = ethers.utils.formatUnits(amountDepositedA, decimalsA)
            const displayAmountDepositedB = ethers.utils.formatUnits(amountDepositedB, decimalsB)
            setTxInfo((prevState) => { return {...prevState,
                blockHash: receipt.blockHash,
                displayAmountDepositedA: displayAmountDepositedA,
                displayAmountDepositedB: displayAmountDepositedB,
            }})
            setIsTxSubmittedOpen(false)
            setIsTxConfirmedOpen(true)

            // (※10) DEBUG
            // await new Promise(resolve => setTimeout(resolve, 2000));
            
            return true
        } catch (error: any) {
            console.log('sendAddTransaction error', error)
            const code = error?.code
            const reason = error?.reason
            if ( code !== undefined && code !== "ACTION_REJECTED" && reason !== undefined) {
                alert(`[Reason for transaction failure] ${reason}`)
            }
            return false
        }
    }

    useEffect(() => {
        const updateDisplayAmountB = async function(addressA: string, addressB: string, amountA: BigNumber, decimalsB: number) {
            const poolAddress: string | undefined = await getPoolAddress(addressA, addressB)
            if (poolAddress !== undefined) {
                const pool = new ethers.Contract(poolAddress, uniswapV2StyleDexPool.abi, signer.provider);
                const reserve0 = await pool.reserve0()
                const reserve1 = await pool.reserve1()
                const [reserveA, reserveB] = (addressA < addressB) ? [reserve0, reserve1] : [reserve1, reserve0]
                const amountB: BigNumber = amountA.mul(reserveB).div(reserveA)      // (※14)
                const displayAmountB: string = ethers.utils.formatUnits(amountB, decimalsB)
                setBField((prevState: TokenField) => { return { ...prevState, displayAmount: displayAmountB }})
                hasAllowance(addressB, amountB).then(setHasAllowanceB)   // (※13)
            } else {      // poolAddressが無かった時(新規トークンペア)用のUI(ボタンのタイプ)更新  (※19)
                let amountB: BigNumber
                try {
                    amountB = ethers.utils.parseUnits(BField.displayAmount, decimalsB)    // (※15)
                } catch (e: any) {     // (※16)
                    alert(`Invalid 2nd token input: ${e.reason}`)
                    return
                }
                hasAllowance(addressB, amountB).then(setHasAllowanceB)
            }
        }
        /**
         * (※12)(※13)
         * 意図せずうまくいっているかのように見えたやつ。Add Liquidity ダイアログが閉じるとき仮に(※12)のcloseAndCleanUp()でhasAllowanceBをリセット
         * しなかった場合、ダイアログを閉じても前回の別のトークンのhasAllowanceB(仮にtrueだとする)の状態を維持しっぱなしなので、新規のトークンペアをプ
         * ールしようとして尚且つB側に未だApproveが住んでいないトークンを入力したら本来updateDisplayAmountBのelse側でhasAllowanceBの状態をtrueにし
         * たりfalseにしたり設定するはずが、elseがなくてもhasAllowanceBがtrueになっててまるでうまくいっているかのように見えてしまう(A側は(※18)で状態
         * を更新するから問題は起きない)。実際に、まだelseを記述していない時でさらにcloseAndCleanUp()のsetHasAllowanceB(false)も記述していない時に上
         * 記の誤認を起こした。意図せずうまくいっているので間違いに気づきにくいがおかしいと思えるポイントがある。それは新規トークンペアをプールする時B側
         * に未だApproveが済んでいないトークンを入力してもApprove住になるという点。これがelse(※19)を作るモチベーションになる。しかし、else以降を記述
         * したらhasAllowanceBをリセットする理由ないような...hasAllowanceAもリセットする意味ないような...毎回必ずhasAllowance関数で状態を設定してる
         * からcloseAndCleanUp()内のsetHasAllowanceA(false)とsetHasAllowanceB(false)はいらない、多分...
         * 
         * (※14)(※15)
         * elseじゃない側とelse側の違い。setBFieldをしてるかしてないか(というよりsetBFieldをする場所)。elseじゃない側はこの関数内でsetBFieldしてる。
         * else側はhandleAmountBChangeでsetBFieldしてる。どちらもsetHasAllowanceBでUIのボタンの状態を更新しているものの、elseじゃない側はB数値欄の
         * 値を弾き出すがelse側はそれをしない、手動で入力するから。
         * (※14)は自動ではじき出された値をamountBとしてBFieldのdisplayAmountにセットしてかつhasAllowanceでAllowanceのチェック。
         * 一方(※15)は手動で入力した値をamountBとしてhasAllowanceでAllowanceのチェック。BFieldのdisplayAmountへのセットは手動で入力した際に
         * handleAmountBChangeで既に済んでいる。
         * 
         * (※16)(※17)
         * catch側になる例。(※17)のif文の条件でトークン未選択,数値未入力を防いでる。けど例えば(!isNewPair || BField.displayAmount !== "")を取
         * り除くと、新規のトークンペアの時トークンB側が未入力でもif文の条件を通過してしまう。そしてupdateDisplayAmountBが起動するがその中のif文
         * は新規トークンペアの場合else側になる。するとtryで何をしようとするかというと、未入力状態の空欄をparseしようとしてしまうのだ。これは出来な
         * いということでcatch側が起動し警告を出すことになる。ただこの例はあえて(!isNewPair || BField.displayAmount !== "")を取り除いたわけで、
         * そうでないならいつcatch側になるんだろう...
        */

        const hasAllowance = async function(address: string, requiredAllowance: BigNumber): Promise<boolean> {
            const allowance: BigNumber = await getAllowance(address)
            if (allowance.lt(requiredAllowance)) {
                return false
            } else {
                return true
            }
        }
        /** 
         * hasAllowanceをuseEffectの中で書いてる理由。useEffectの外で書いても多分別にいいが、ブロックチェーンにallowanceをawaitで確認するという
         * 時間のかかる処理があるので、そんな時間のかかる処理を再レンダリングの度にしたくない。この処理を必要とする時(useEffect内の内容)のみこの処
         * 理が走って欲しい。
        */

        // (※17)
        if ((AField.address !== "") && (BField.address !== "") && (!isNewPair || BField.displayAmount !== "") && (AField.displayAmount !== "") && (AField.address !== BField.address)) {
            const addressA = AField.address
            const addressB = BField.address
            const tokenAData: TokenData = loadTokenData(chainId, addressA)!
            const tokenBData: TokenData = loadTokenData(chainId, addressB)!
            let amountA: BigNumber
            try {
                amountA = ethers.utils.parseUnits(AField.displayAmount, tokenAData.decimals)
            } catch (e: any) {
                alert(`Invalid 1st token input: ${e.reason}`)
                return
            }
            hasAllowance(addressA, amountA).then(setHasAllowanceA)   // (※18)
            updateDisplayAmountB(addressA, addressB, amountA, tokenBData.decimals)
            setIsFilled(true)
        } else {     // 元々setIsFilled初期値falseだからこのelseでfalseにするやつ不要に思えるけど、UIで打ち直した時用。
            setIsFilled(false)
        }
        /** 
         * (※17)
         * ifの条件(!isNewPair || BField.displayAmount !== "")について。
         * これがない場合、既にトークンペアがある時は問題ないが、新規トークンペアの時B側数値欄未入力でも条件を突破してしまいupdateDisplayAmountB内
         * の(※15)で空欄をパースしようとしてしまい(※16)の警告がでる。
         * 条件から !isNewPair を取り除き(BField.displayAmount !== "")にすると逆の問題がおき、新規トークンペアの時は上手くいくが既にトークンペア
         * がある時に問題がおきる。B側数値欄に自動で値が出力されないのだ。既にトークンペアがある時はB側数値欄以外が埋まった時に条件を通過し
         * updateDisplayAmountBが発火しその中でB側の数値を弾き出してほしいのだが、B側数値欄を埋めていないのでif文の条件を突破できず
         * updateDisplayAmountBを発動できない。「B側数値欄に出力する値を計算をするためにB側数値欄に値を入力しろ」というチンプンカンプンな事になって
         * しまっているのだ。
         * 新規トークンペアじゃない時は(BField.displayAmount !== "")という条件を打ち消して、新規トークンペアの時には(BField.displayAmount !== "")
         * という条件が発動するようにしたいわけだ。ということで(!isNewPair || BField.displayAmount !== "")となった。if文の条件がややこしくなったの
         * で以下に簡単にして説明する。まず(A && B && C && D && E)という形になっている。A,B,C,D,Eが全て真であればok。A,B,C,D,Eの内の1つである
         * (!isNewPair || BField.displayAmount !== "")が真になるには(!isNewPair) か (BField.displayAmount !== "") のいずれか(または両方)が真で
         * あればok。もっと言うと、(isNewPair が false) または (BField.displayAmount が空文字列じゃない)であればok。もっと言うと、
         * (新規トークンペアじゃない)または(B側数値欄が空欄じゃない)であればok。
         * これによって、B側数値欄を入力しないとダメだけど、B側数値欄が空欄でも新規トークンペアじゃないなら大丈夫だよって条件になった。
        */

        // if input amount is empty, then clear the output amount
        if (AField.displayAmount === "") {
            setBField((prevState: TokenField) => { return { ...prevState, displayAmount: ""}})
        }
    }, [AField.address, BField.address, AField.displayAmount, BField.displayAmount, chainId, signer, isNewPair, getPoolAddress, getAllowance])

    useEffect(() => {
        if (AField.address !== "" && AField.address === BField.address) {
            alert("Please select a different token")
            return
        }
        /** 
         * ・互いに同じものを選択してはいけないが、両方とも未選択なのは構わない。「Aが空欄ではなく、かつAとBが同じ」には「Bが空欄ではない」というのが
         * 含まれているので書く必要がない。
         * ・このuseEffect内に書く理由。「同じトークンを選ぶな」というのはトークンが選択された時点で発動して欲しいから。balanceを表示するuseEffectが
         * まさにその発動タイミングとしては丁度いいわけだ。
         * ・演算子(四則演算,論理演算とか)には優先順位があり、この場合 !== と === が先に評価されその後 && を計算する。
        */

        if (AField.address !== "" && BField.address !== "") {
            getPoolAddress(AField.address, BField.address).then((poolAddress: string | undefined) => {
                if (poolAddress === undefined) { setIsNewPair(true) } else { setIsNewPair(false) }
            })
        }
        /** 
         * ・このuseEffect内に書く理由。「新しいトークンペアかどうか」はトークンを選んだ際に判別して欲しいから。balanceを表示するuseEffectがその発動
         * タイミングとして丁度いい。
        */

        // Show "Balance" of each token
        if (AField.address !== "") {
            getDisplayBalance(AField.address).then((displayBalance: string) => {
                setAField((prevState: TokenField) => { return { ...prevState, displayBalance: displayBalance}})
            })
        }
        if (BField.address !== "") {
            getDisplayBalance(BField.address).then((displayBalance: string) => {
                setBField((prevState: TokenField) => { return { ...prevState, displayBalance: displayBalance}})
            })
        }
    }, [AField.address, BField.address, getDisplayBalance, getPoolAddress])

    return (
        <>
            <Transition appear show={show} as={Fragment}>
                {/* ↑(※3) */}
                <Dialog as="div" className={style.dialog} onClose={closeAndCleanUp}>
                    {/* ↑(※2) */}
                    <Dialog.Overlay className={style.overlay}/>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div className={style.panelContainer}>
                            <Dialog.Panel className={style.panel}>
                                <div className={style.titleContainer}>
                                    <Dialog.Title as="h3" className={style.title}>
                                        Add Liquidity to a Pool
                                    </Dialog.Title>
                                </div>
                                <div>
                                    {/* tokenA field */}
                                    <div className={style.currencyContainer}>
                                        <div className={style.currencyInputContainer}>
                                            <input
                                                type='text'
                                                className={style.currencyInput}
                                                placeholder='0'
                                                onChange={handleAmountAChange}
                                                value={AField.displayAmount}
                                            />
                                        </div>
                                        <div className={style.currencySelector}>
                                            <TokenCombobox chainId={chainId} setTokenField={setAField}/>
                                        </div>
                                    </div>
                                    <div className={style.currencyBalanceContainer}>
                                        <div className={style.currencyBalance}>
                                            { AField.displayBalance !== "" ? (<>{`Balance: ${AField.displayBalance}`}</>) : null }
                                        </div>
                                    </div>
                                    {/* tokenB field */}
                                    <div className={style.currencyContainer}>
                                        <div className={style.currencyInputContainer}>
                                            <input
                                                type='text'
                                                className={style.currencyInput}
                                                placeholder='0'
                                                disabled={!isNewPair}
                                                onChange={handleAmountBChange}
                                                value={BField.displayAmount}
                                            />
                                        </div>
                                        <div className={style.currencySelector}>
                                            <TokenCombobox chainId={chainId} setTokenField={setBField}/>
                                        </div>
                                    </div>
                                    <div className={style.currencyBalanceContainer}>
                                        <div className={style.currencyBalance}>
                                            {BField.displayBalance !== "" ? (<>{`Balance: ${BField.displayBalance}`}</>) : null}
                                        </div>
                                    </div>
                                    {/* buttons */}
                                    <div className={style.messageContainer}>
                                        { isNewPair ? (<div>New Pool will be created. Please deposit tokens of equal value at current market prices.</div>) : null }
                                    </div>
                                    <div className={style.buttonOuterContainer}>
                                        {!isFilled ? (<button type="button" className={style.inactiveConfirmButton}>Confirm</button>) : null}
                                        {(isFilled && (!hasAllowanceA || !hasAllowanceB)) ? (
                                            <div className={style.buttonListContainer}>
                                                {!hasAllowanceA ?
                                                    (<button onClick={e => handleApproval(e, AField.address, setHasAllowanceA)} className={style.approveButton}>
                                                        {`Allow to use your ${loadTokenData(chainId, AField.address)?.symbol} (one time approval)`}
                                                    </button>) : null}
                                                {!hasAllowanceB ?
                                                    (<button onClick={e => handleApproval(e, BField.address, setHasAllowanceB)} className={style.approveButton}>
                                                        {`Allow to use your ${loadTokenData(chainId, BField.address)?.symbol} (one time approval)`}
                                                    </button>) : null}
                                            </div>
                                        ) : null}
                                        {(isFilled && hasAllowanceA && hasAllowanceB) ? (
                                            <button type="button" onClick={handleAdd} className={style.confirmButton}>Confirm</button>
                                        ) : null}
                                    </div>
                                    {/* ↑(※20) */}
                                </div>
                            </Dialog.Panel>
                        </div>
                    </Transition.Child>
                </Dialog>
            </Transition>
            {/* AddLiquidity Transaction Dialogs */}
            <TxDialog
                title='Transaction Submitted'
                txURL={`${loadChainData(chainId)?.explorer}/tx/${txInfo.transactionHash}`}
                show={isTxSubmittedOpen}
                onClose={() => setIsTxSubmittedOpen(false)}
            />
            <TxDialog
                title='Transaction Confirmed!'
                message={`${txInfo.displayAmountDepositedA} ${txInfo.symbolA} and ${txInfo.displayAmountDepositedB} ${txInfo.symbolB} are sent from your address to the pool.`}
                txURL={`${loadChainData(chainId)?.explorer}/tx/${txInfo.transactionHash}`}
                show={isTxConfirmedOpen}
                onClose={() => setIsTxConfirmedOpen(false)}
            />
            {/* (※11) messageの部分について */}
        </>
    )
}
/** 
 * このonCloseに登録したものを発火させるトリガーとなるアクションが多分ある。例えばウィンドウの外をクリックとか。おそらくinputタグのonChangeに近い。input
 * タグのテキストタイプの場合、onChangeは入力欄に何か入力されるたびに発火する。それみたいな感じで、DialogタグのonCloseはウィンドウの外をクリックするたび
 * に発火する。多分。
 * 
 * (※9)(※10)(※11)
 * txInfo.symbolAじゃなくてloadTokenData(chainId, BField.address).symbolでも良さそうに見えるが良くない。なぜならcloseAndCleanUp()でBFieldをリセット
 * しているから。プールするトークンを入力するAdd Liquidityダイアログが閉じるタイミングでBFieldはリセットされる。
 * 厳密にいうと実はloadTokenData(chainId, BField.address).symbolの値は2個目のダイアログにちゃんと映っているのだが、一瞬過ぎるのだ。試しに(※10)の位置
 * で数秒待ち時間を作ってみればちゃんと値が表示されているのが確認できる。しかし通常この箇所は一瞬で計算されてしまうのでまるで表示されていないかのように見
 * えるのだ。ということでcloseAndCleanUp()しても大丈夫なようにtxInfo.symbolAの方にする必要がある。
 * 
 * (※20)
 * ・ボタンを作る方法にはbuttonタグとdivタグとinputタグがある。
 * ・type="button"について。button はデフォルトで type="submit" を持ちフォームタグ内で使用された場合にフォームを送信してしまう可能性がある。そのため、
 * button タグの振る舞いを明確にするために type="button" を追加することが推奨される。このコードでは、button タグがフォーム送信の挙動を引き起こすこと
 * はないが、将来的にコードの構造が変わる可能性を考えると、安全のために type="button" を追加しておくことは賢明。
*/

export default AddLiquidityDialog