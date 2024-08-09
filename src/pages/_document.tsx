import { Html, Head, Main, NextScript } from 'next/document'
 
export default function Document() {

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "MooSwap",
        "url": "https://mooswap-finance.vercel.app/"
    };

    return (
        <Html lang="en">
            <Head>
                <link rel="icon" href="/favicon.ico" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}