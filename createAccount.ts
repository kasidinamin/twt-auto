import { Keypair } from '@solana/web3.js';
import type {
    AuthenticationFacade
} from '@dialectlabs/sdk';
import {
    DialectSolanaWalletAdapterWrapper,
    NodeDialectSolanaWalletAdapter,
    SolanaEd25519AuthenticationFacadeFactory,
    DialectWalletAdapterSolanaEd25519TokenSigner,
    SolanaEd25519TokenSigner
} from '@dialectlabs/blockchain-sdk-solana';

import { Duration } from 'luxon';
import * as bs58 from "bs58";
import * as fs from 'fs';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { generateUsername } from "unique-username-generator";
import {
    DataLoginDialect,
    StickerPackOnboarding
} from './interface/login.interface';
import {
    CollectionResponseDetail
} from './interface/collection.interface';
import question from './libs/question';

interface createAccountGenerateJWT {
    jwt?: string;
    privateKey?: string;
    publicKey?: string;
}

interface GeneralStatus {
    status?: string;
}



function generateRequestId(leng: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = leng;
    let requestId = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        requestId += characters.charAt(randomIndex);
    }

    return requestId;
}

async function createAccountAndGenerateJWT(): Promise<createAccountGenerateJWT> {
    let wallet: DialectSolanaWalletAdapterWrapper;
    let walletKeypair: Keypair;
    let signer: SolanaEd25519TokenSigner;
    let authenticationFacade: AuthenticationFacade;


    walletKeypair = Keypair.generate();
    const privateKey = walletKeypair.secretKey;
    const publicKey = walletKeypair.publicKey;

    // Mendapatkan string dari privateKey dan publicKey
    const privateKeyBs58 = bs58.encode(privateKey);
    const publicKeyString = publicKey.toBase58();


    //@ts-ignore
    wallet = new DialectSolanaWalletAdapterWrapper(NodeDialectSolanaWalletAdapter.create(walletKeypair));

    signer = new DialectWalletAdapterSolanaEd25519TokenSigner(wallet);
    authenticationFacade = new SolanaEd25519AuthenticationFacadeFactory(
        signer,
    ).get();


    const token = await authenticationFacade.generateToken(
        Duration.fromObject({ seconds: 10000 }),
    );
    const isValid = authenticationFacade.isValid(token);
    if (!isValid) {
        throw new Error('JWT Not Valid!')
    }

    const encodedMessage = new TextEncoder().encode(token.rawValue);
    wallet.signMessage(encodedMessage)

    return {
        jwt: token.rawValue,
        privateKey: privateKeyBs58,
        publicKey: publicKeyString
    }
};

async function LoginDialect(jwt: string, deviceId: string, requestId: string): Promise<DataLoginDialect> {
    return new Promise((resolve, reject) => {
        fetch('https://dial.dialectapi.to/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Host': 'dial.dialectapi.to',
                'X-Client-Name': 'dial-app',
                'X-Amzn-Trace-Id': 'Root=1-648be3c4-466450dde23c26529d1cf7a1',
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Bearer ' + jwt,
                'X-Client-Version': '0.0.67',
                'X-Client-Device': 'iphone 12',
                'Accept-Encoding': 'gzip, deflate',
                'X-Client-Platform': 'ios',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'X-Request-Id': requestId,
                'Content-Length': '0',
                'User-Agent': 'DialApp/1 CFNetwork/1408.0.4 Darwin/22.5.0',
                'X-Device-Id': deviceId
            }
        })
            .then(response => {
                if (response.ok) {
                    return response.json() as Promise<DataLoginDialect>;
                } else {
                    throw new Error('Failed request LoginDialect');
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
};

async function updateProfileDialect(
    jwt: string,
    deviceId: string,
    requestId: string,
    username: string
): Promise<DataLoginDialect> {
    return new Promise((resolve, reject) => {
        fetch('https://dial.dialectapi.to/api/v2/users/me/profile', {
            method: 'PUT',
            headers: {
                'Host': 'dial.dialectapi.to',
                'X-Client-Name': 'dial-app',
                'Content-Type': 'application/json',
                'X-Amzn-Trace-Id': 'Root=1-648be405-337d5f76a558981233684c0f',
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Bearer ' + jwt,
                'X-Client-Version': '0.0.67',
                'X-Client-Device': 'iphone 12',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'X-Client-Platform': 'ios',
                'Accept-Encoding': 'gzip, deflate',
                'X-Request-Id': requestId,
                'Content-Length': '22',
                'User-Agent': 'DialApp/1 CFNetwork/1408.0.4 Darwin/22.5.0',
                'X-Device-Id': deviceId
            },
            body: JSON.stringify({
                'name': username
            })
        })
            .then(async response => {
                if (response.ok) {
                    return response.json() as Promise<DataLoginDialect>;
                } else {
                    throw new Error('Failed request UpdateProfileDialect');
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
};

async function getOnboardingStickerPack(
    jwt: string,
    deviceId: string,
    requestId: string
): Promise<StickerPackOnboarding> {
    return new Promise((resolve, reject) => {
        fetch('https://dial.dialectapi.to/api/v1/users/me/onboarding/stickerPacks', {
            method: 'POST',
            headers: {
                'Host': 'dial.dialectapi.to',
                'X-Client-Name': 'dial-app',
                'X-Amzn-Trace-Id': 'Root=1-648d47f5-620bfd0b62adf24c844ce843',
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Bearer ' + jwt,
                'X-Client-Version': '0.0.67',
                'X-Client-Device': 'iphone 12',
                'Accept-Encoding': 'gzip, deflate',
                'X-Client-Platform': 'ios',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'X-Request-Id': requestId,
                'Content-Length': '0',
                'User-Agent': 'DialApp/1 CFNetwork/1408.0.4 Darwin/22.5.0',
                'X-Device-Id': deviceId
            }
        })
            .then(async response => {
                if (response.ok) {
                    return response.json() as Promise<StickerPackOnboarding>;
                } else {
                    throw new Error('Failed request getOnboardingStickerPack');
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
};

async function getDetailCollection(
    jwt: string,
    deviceId: string,
    requestId: string,
    collectionId: string
): Promise<CollectionResponseDetail> {
    return new Promise((resolve, reject) => {
        fetch('https://dial.dialectapi.to/api/v1/stickers/collections/' + collectionId, {
            headers: {
                'Host': 'dial.dialectapi.to',
                'X-Client-Name': 'dial-app',
                'X-Amzn-Trace-Id': 'Root=1-648d47f8-6658ac2ebcb47de5a7faef7f',
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Bearer ' + jwt,
                'X-Client-Version': '0.0.67',
                'X-Client-Device': 'iphone 12',
                'Accept-Encoding': 'gzip, deflate',
                'X-Client-Platform': 'ios',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'X-Request-Id': requestId,
                'User-Agent': 'DialApp/1 CFNetwork/1408.0.4 Darwin/22.5.0',
                'X-Device-Id': deviceId
            }
        })
            .then(async response => {
                if (response.ok) {
                    return response.json() as Promise<CollectionResponseDetail>;
                } else {
                    throw new Error('Failed request getDetailCollection');
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
};

async function ticketMintingDetail(
    jwt: string,
    deviceId: string,
    requestId: string,
    ticketId: string
): Promise<GeneralStatus> {
    return new Promise((resolve, reject) => {
        fetch(`https://dial.dialectapi.to/api/v1/tickets-minting/${ticketId}/mint`, {
            headers: {
                'Host': 'dial.dialectapi.to',
                'X-Client-Name': 'dial-app',
                'X-Amzn-Trace-Id': 'Root=1-648d47f9-8a9b17df2bad779740a11929',
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Bearer ' + jwt,
                'X-Client-Version': '0.0.67',
                'X-Client-Device': 'iphone 12',
                'Accept-Encoding': 'gzip, deflate',
                'X-Client-Platform': 'ios',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'X-Request-Id': requestId,
                'User-Agent': 'DialApp/1 CFNetwork/1408.0.4 Darwin/22.5.0',
                'X-Device-Id': deviceId
            }
        })
            .then(async response => {
                if (response.ok) {
                    return response.json() as Promise<GeneralStatus>;
                } else {
                    throw new Error('Failed request ticketMintingDetail');
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
};

async function minting(
    jwt: string,
    deviceId: string,
    requestId: string,
    ticketId: string
): Promise<any> {
    return new Promise((resolve, reject) => {
        fetch(`https://dial.dialectapi.to/api/v1/tickets-minting/${ticketId}/mint`, {
            method: 'POST',
            headers: {
                'Host': 'dial.dialectapi.to',
                'X-Client-Name': 'dial-app',
                'X-Amzn-Trace-Id': 'Root=1-648d47f9-8a9b17df2bad779740a11929',
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Bearer ' + jwt,
                'X-Client-Version': '0.0.67',
                'X-Client-Device': 'iphone 12',
                'Accept-Encoding': 'gzip, deflate',
                'X-Client-Platform': 'ios',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'X-Request-Id': requestId,
                'User-Agent': 'DialApp/1 CFNetwork/1408.0.4 Darwin/22.5.0',
                'X-Device-Id': deviceId
            }
        })
            .then(async response => {
                if (response.ok) {
                    return response.text() as Promise<any>
                } else {
                    throw new Error('Failed request minting');
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
};

(async () => {

    const manyAccount: string = await question('jumlah akun yang akan dibuat? ');
    const manyAccountResult = parseInt(manyAccount);

    if (!isNaN(manyAccountResult)) {
        console.log('')
        for (let index = 0; index < manyAccountResult; index++) {
            try {
                console.log('=======================================')
                console.log('')
                const deviceId: string = uuidv4();
                const requestId: string = generateRequestId(20);


                if (!fs.existsSync('./accounts')) {
                    fs.mkdirSync('./accounts')
                }

                console.log(chalk.yellow('Creating Account.....'))
                const resultCreateAccount = await createAccountAndGenerateJWT();
                if (resultCreateAccount.jwt) {
                    console.log(chalk.green('Success Creating Account...'))
                    console.log(chalk.yellow('Try Logining account....'))

                    //login dialect
                    const loginDialectResult = await LoginDialect(resultCreateAccount.jwt, deviceId, requestId);
                    console.log(chalk.green('Login Account Success!'));
                    console.log(chalk.green(`Wallet Address : ${loginDialectResult.user.walletAddress}`));

                    // simpan public key dan private key ke file
                    fs.appendFileSync('./accounts/accounts.txt', `${resultCreateAccount.publicKey}|${resultCreateAccount.privateKey}\n`);

                    const username: string = generateUsername("", 0, 10) + generateRequestId(5);
                    const updateProfileDialectResult = await updateProfileDialect(
                        resultCreateAccount.jwt,
                        deviceId,
                        requestId,
                        username);
                    console.log(chalk.green(`Username : ${updateProfileDialectResult.user.name}`));


                } else {
                    console.log(chalk.red('Failed Create Account and Generate JWT!'))
                    throw new Error('Failed Create Account and Generate JWT!')
                }

            } catch (e) {
                console.log(chalk.red(e))
            }
            console.log('')
        }
    } else {
        throw new Error('Value not a number!')
    }
})();