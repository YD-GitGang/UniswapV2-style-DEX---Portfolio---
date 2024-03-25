import { useState, useContext } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowDownIcon } from '@heroicons/react/24/solid'
import { ChainContext } from './ChainContext'
import TokenCombobox from './TokenCombobox'
import { swapStyle as style } from '../styles/tailwindcss'

export interface TokenField {   //(※3)
    address: string,
    displayAmount: string,
    displayBalance: string,
}
//exportしてTokenComboboxで使ってる。
//exportしたいものをSwapコンポーネント内で記述するとエラーになる、多分。
/*
 - (※3)(※4)
 - (※3)で型を作って(※4)でstateにしてる理由は入力欄とかトークン選択ボックスが「変化」するたびに再レンダリングする仕組みを作りたいから。
*/

const Swap = () => {
    const emptyField: TokenField = {address: '', displayAmount: '', displayBalance: ''}  // :と=で迷ってdisplayAmount=''って書こうとした。
    const [inField, setInField] = useState<TokenField>(emptyField)    // (※4)
    const [outField, setOutField] = useState<TokenField>(emptyField)
    const { chainId } = useContext(ChainContext)

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