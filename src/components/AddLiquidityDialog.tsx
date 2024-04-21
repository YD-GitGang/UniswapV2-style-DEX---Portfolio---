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
    const [isField, setIsField] = useState<boolean>(false)
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
            const parsedLogs = receipt.logs     // (※8)
                .filter((log: any) => log.address.toLowerCase() === poolAddress.toLowerCase())
                .map((log: any) => poolInterface.parseLog(log))
            const MintEvent = parsedLogs.filter((event: any) => event.name === 'Mint')[0]
            const [sender, amount0, amount1] = MintEvent.args  // (※6)
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
                const amountB: BigNumber = amountA.mul(reserveB).div(reserveA)
                const displayAmountB: string = ethers.utils.formatUnits(amountB, decimalsB)
                setBField((prevState: TokenField) => { return { ...prevState, displayAmount: displayAmountB }})
                hasAllowance(addressB, amountB).then(setHasAllowanceB)
            }
        }

        const hasAllowance = async function(address: string, requiredAllowance: BigNumber): Promise<boolean> {
            const allowance: BigNumber = await getAllowance(address)
            if (allowance.lt(requiredAllowance)) {
                return false
            } else {
                return true
            }
        }

        if ((AField.address !== "") && (BField.address !== "") && (AField.displayAmount !== "") && (AField.address !== BField.address)) {
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
            hasAllowance(addressA, amountA).then(setHasAllowanceA)
            updateDisplayAmountB(addressA, addressB, amountA, tokenBData.decimals)
            setIsField(true)
        } else {
            setIsField(false)
        }

        // if input amount is empty, then clear the output amount
        if (AField.displayAmount === "") {
            setBField((prevState: TokenField) => { return { ...prevState, displayAmount: ""}})
        }
    }, [AField.address, BField.address, AField.displayAmount, chainId, signer, getPoolAddress, getAllowance])

    useEffect(() => {
        if (AField.address !== "" && AField.address === BField.address) {
            alert("Pleace select a defferent token")
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
                        enterTo="opacity-100 scale=100"
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
                                        {!isField ? (<button type="button" className={style.inactiveConfirmButton}>Confirm</button>) : null}
                                        {(isField && (!hasAllowanceA || !hasAllowanceB)) ? (
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
                                        {(isField && hasAllowanceA && hasAllowanceB) ? (
                                            <button type="button" onClick={handleAdd} className={style.confirmButton}>Confirm</button>
                                        ) : null}
                                    </div>
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
            {/* (※11) messageの箇所について */}
        </>
    )
}
/** 
 * このonCloseに登録したものを発火させるトリガーとなるアクションが多分ある。例えばウィンドウの外をクリックとか。おそらくinputタグのonChangeに近い。input
 * タグのテキストタイプの場合、onChangeは入力欄に何か入力されるたびに発火する。それみたいな感じで、DialogタグのonCloseはウィンドウの外をクリックするたび
 * に発火する。多分。
*/

export default AddLiquidityDialog