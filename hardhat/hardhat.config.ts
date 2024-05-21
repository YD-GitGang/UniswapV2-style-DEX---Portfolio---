import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// import * as dotenv from "dotenv";
// dotenv.config();    // (※5)

// const privateKey0: string = process.env.PRIVATE_KEY ?? "";    // (※1)
// if (privateKey0 === "") {
//   throw new Error('No value set for environment variable PRIVATE_KEY');
// }

// const sepoliaUrl: string = process.env.SEPOLIA_URL ?? "";      // (※2)
// if (sepoliaUrl === "") {
//   throw new Error('No value set for environment variable SEPOLIA_URL');
// }

// const polygonUrl: string = process.env.POLYGON_URL ?? "";      // (※3)
// if (polygonUrl === "") {
//   throw new Error('No value set for environment variable POLYGON_URL');
// }

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {     // (※4)
    // sepolia : {
    //   url: sepoliaUrl,
    //   accounts: [privateKey0],
    //   chainId: 11155111,
    // },
    // polygon : {
    //   url: polygonUrl,
    //   accounts: [privateKey0],
    //   chainId: 137,
    // }
  }
};

/** 
 * UIデプロイ時にコメントアウトする箇所
 * UI側にとってhardhatのフォルダはコンパイルしたartifactsの中の物が欲しいだけで、コントラクトをデプロイした時に使った設定とかは不要。だから
 * UIデプロイ時に.envファイルがない事でエラーになる(※1)(※2)(※3)(※4)(※5)はコメントアウトする。ここで疑問なのが、UIをデプロイする時に
 * Varcelでビルドのコマンドを設定するけど、そのコマンドでhardhat.config.tsが走っちゃうとは思はなかったんだけど...走っちゃうのかな...走るな
 * んて思ってなかったからコメントアウトしなきゃとか思えなかった...
*/

export default config;
