import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ChainContextProvider } from '@/components/ChainContext'

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ChainContextProvider>
            <Component {...pageProps} />
        </ChainContextProvider>
    )
}
