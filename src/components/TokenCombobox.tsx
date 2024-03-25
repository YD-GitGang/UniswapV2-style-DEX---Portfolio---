import { NextPage } from 'next';
import Image from 'next/image'
import { useContext, useState } from 'react'
import { Fragment } from 'react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { Combobox, Transition } from '@headlessui/react'
import type { TokenField } from './Swap'
import { loadTokenList, loadTokenLogo } from '../lib/load'
import type { TokenData } from '../lib/load'
import { tokenComboboxStyle as style } from '../styles/tailwindcss'

interface TokenComboboxProps {
    chainId: number
    setTokenField: React.Dispatch<React.SetStateAction<TokenField>>
}

const TokenCombobox = (props: TokenComboboxProps) => {
    const chainId = props.chainId
    const setTokenField = props.setTokenField
    const tokenList = loadTokenList(chainId)
    const dummyTokenData = { chainId: chainId, address: "", symbol: "Select token", name: "", decimals: 0, logo: "" }
    const [selectedToken, setSelectedToken] = useState<TokenData>(dummyTokenData)
    const [query, setQuery] = useState('')
    const filteredTokenList = query === ''
        ? tokenList
        : tokenList.filter((token) =>
            (token.symbol + token.name)
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        )

    function onTokenSelected(token: TokenData) {
        setSelectedToken(token)
        setTokenField((prevState: TokenField) => {return { ...prevState, address: token.address }})
    }

    return (
        <Combobox
            value={selectedToken}
            onChange={onTokenSelected}
        >
            <div className={style.innerContainer}>
                <Combobox.Button className={selectedToken.address ? style.button : style.buttonDefault}>
                    {selectedToken.address ?
                        (<Image src={loadTokenLogo(chainId, selectedToken.address)} alt='token logo' height={24} width={24} className={style.tokenLogo} />
                        ) : null
                    }
                    <span>{selectedToken.symbol}</span>
                    <ChevronDownIcon className={style.downIcon}/>
                </Combobox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery('') }
                >
                    <Combobox.Options className={style.options}>
                        {/* Search Box */}
                        <Combobox.Input
                            className={style.input}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search here..."
                        />
                        {/* Token Selection Menu  */}
                        { filteredTokenList.length === 0 && query !== '' ? (
                                <div className={style.unmatch}>
                                    Nothing found.
                                </div>
                        ) : (
                            filteredTokenList.map((token: TokenData, tokenIdx) => (
                            <Combobox.Option
                                key={tokenIdx}
                                className={ ({ active }) => active ? style.optionActive : style.option }
                                value={token}
                            >
                                {({ selected }) => (
                                    <>
                                        {selected ? (
                                            <span className={style.checkIconContainer}>
                                                <CheckIcon className={style.checkIcon} aria-hidden="true" />
                                            </span>
                                        ) : null}
                                        <div className={style.tokenContainer}>
                                            <Image src={loadTokenLogo(chainId, token.address)} alt='token logo' width="0" height="0" style={{ width: 18, height: 18 }} />
                                            <span className={selected ? style.tokenSymbolSelected : style.tokenSymbol} >
                                                {token.symbol}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </Combobox.Option>
                        )))}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    )
}

export default TokenCombobox