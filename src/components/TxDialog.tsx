import { ethers, BigNumber } from "ethers"
import { useContext, useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { txDialogStyle as style } from '@/styles/tailwindcss'

interface TxDialogProps {
    title: string
    message?: string
    txURL?: string
    show: boolean
    onClose: () => void
}

const TxDialog = (props: TxDialogProps) => {
    const title: string = props.title  // e.g. 'Transaction Submitted'
    const message: string | undefined = props.message
    const txURL: string | undefined = props.txURL
    const show: boolean = props.show
    const onClose: () => void = props.onClose
    return (
        <Transition show={show} as={Fragment}>
            <Dialog as="div" className={style.dialog} onClose={onClose}>
                <Dialog.Overlay className={style.overlay} />
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
                            <Dialog.Title as="h3" className={style.title}>
                                {title}
                            </Dialog.Title>
                            <div className={style.body}>
                                {(message !== undefined) ? (
                                    <p className={style.p}>
                                        {message}
                                    </p>
                                ) : (null)}
                                {(txURL !== undefined) ? (
                                    <p className={style.p}>
                                        <span>You can view the transaction </span>
                                        <span className={style.linkText}><a href={txURL} target="_blank" rel="noreferrer">here</a></span>.
                                    </p>
                                ) : (null)}
                            </div>
                            <div className={style.buttonContainer}>
                                <button type="button" className={style.button} onClick={onClose}>
                                    Got it
                                </button>
                            </div>
                        </Dialog.Panel>
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition>
    )
}

export default TxDialog