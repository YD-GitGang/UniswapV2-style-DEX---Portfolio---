import { ethers, BigNumber } from 'ethers'
import { useState, useContext, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ChainContext } from '@/components/ChainContext'
import { loadTokenData } from '@/lib/load'
import type { TokenData } from '@/lib/load'
import type { TokenField } from '@/components/Swap'
import TokenCombobox from '@/components/TokenCombobox'
import { AddLiquidityStyle as style } from '@/styles/tailwindcss'
import uniswapV2StyleDexPool from '../../hardhat/artifacts/contracts/uniswapV2StyleDexPool.sol/uniswapV2StyleDexPool.json'


interface addLiquidityDialogProps {
    show: boolean
    onClose: () => void
}

const AddLiquidityDialog = (props: addLiquidityDialogProps) => {
    const {show, onClose} = props
    const emptyField: TokenField = { address: '', displayAmount: '', displayBalance: '' }
    const [AField, setAField] = useState<TokenField>(emptyField)
    const [BField, setBField] = useState<TokenField>(emptyField)
    const [isNewPair, setIsNewPair] = useState<boolean>(false)    // (※1)
    const { chainId, signer, getPoolAddress, getDisplayBalance } = useContext(ChainContext)
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
        const cleansedDisplayAmountB = e.target.value.replace(/[^0-9.]+/g, '')
        setBField((prevState: TokenField) => { return { ...prevState, displayAmount: cleansedDisplayAmountB }})
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
                alert(`invalid input: ${e.reason}`)
                return
            }
            updateDisplayAmountB(addressA, addressB, amountA, tokenBData.decimals)
        }

        // if input amount is empty, then clear the output amount
        if (AField.displayAmount === "") {
            setBField((prevState: TokenField) => { return { ...prevState, displayAmount: ""}})
        }
    }, [AField.address, BField.address, AField.displayAmount, chainId, signer, getPoolAddress])

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
    }, [AField.address, BField.address, getDisplayBalance])

    return (
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
                            </div>
                        </Dialog.Panel>
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition>
    )
}
/** 
 * このonCloseに登録したものを発火させるトリガーとなるアクションが多分ある。例えばウィンドウの外をクリックとか。おそらくinputタグのonChangeに近い。input
 * タグのテキストタイプの場合、onChangeは入力欄に何か入力されるたびに発火する。それみたいな感じで、DialogタグのonCloseはウィンドウの外をクリックするたび
 * に発火する。多分。
*/

export default AddLiquidityDialog