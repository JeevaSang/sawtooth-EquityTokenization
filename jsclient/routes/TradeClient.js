

const { createHash } = require('crypto')
const { CryptoFactory, createContext } = require('sawtooth-sdk/signing')
const protobuf = require('sawtooth-sdk/protobuf')
const fs = require('fs')
const fetch = require('node-fetch');
const { Secp256k1PrivateKey } = require('sawtooth-sdk/signing/secp256k1')
const { TextEncoder, TextDecoder } = require('text-encoding/lib/encoding')

FAMILY_NAME = 'equity-tokenization'

function hash(v) {
  return createHash('sha512').update(v).digest('hex');
}

class TradeClient {
  //Creating a private key and signer
  constructor(userid) {
    const privateKeyStrBuf = this.getUserPriKey(userid);
    const privateKeyStr = privateKeyStrBuf.toString().trim();
    const context = createContext('secp256k1');
    //Extract the private key
    const privateKey = Secp256k1PrivateKey.fromHex(privateKeyStr);
    this.signer = new CryptoFactory(context).newSigner(privateKey);
    //Extract the public key
    this.publicKey = this.signer.getPublicKey().asHex();
    //Address is 6-char TF + hash of user public key
    this.address = hash(FAMILY_NAME).substr(0, 6) + hash(this.publicKey).substr(0, 64);
  }

  allocate(unit, token) {
    this._wrap_and_send("allocate", [unit, token]);
  }

  balance() {
    let unit = this._send_to_rest_api(null);
    return unit;
  }

  transfer(user2, unit, token) {
    this._wrap_and_send("transfer", [unit, token, user2]);
  }

  getUserPriKey(userid) {
    console.log(userid);
    console.log("Current working directory is: " + process.cwd());
    var userprivkeyfile = '/root/.sawtooth/keys/' + userid + '.priv';
    return fs.readFileSync(userprivkeyfile);
  }

  getUserPubKey(userid) {
    console.log(userid);
    console.log("Current working directory is: " + process.cwd());
    var userpubkeyfile = '/root/.sawtooth/keys/' + userid + '.pub';
    return fs.readFileSync(userpubkeyfile);
  }
  //call passing action ("allocate" or "transfer") 
  //Allocate State - unit,token
  //Transfer State - unit, token, toUser
  //create a transaction, then wrap it in a batch
  _wrap_and_send(action, values) {
    var payload = ''
    //construct the address where we'll store our state
    const address = this.address;
    var inputAddressList = [address];
    var outputAddressList = [address];
    console.log("Action for: " + action);
    //Encoding payload - Generate a csv UTF-8 encoded string as the payload
    if (action === "transfer") {
      const pubKeyStrBuf = this.getUserPubKey(values[2]);
      const pubKeyStr = pubKeyStrBuf.toString().trim();
      var toAddress = hash(FAMILY_NAME).substr(0, 6) + hash(pubKeyStr).substr(0, 64);
      inputAddressList.push(toAddress);
      outputAddressList.push(toAddress);
      payload = action + "," + values[0] + "," + values[1] + "," + pubKeyStr;
    }
    else {
      payload = action + "," + values[0] + "," + values[1];
    }
    var enc = new TextEncoder('utf8');
    const payloadBytes = enc.encode(payload);
    //Create a Transaction Header
    const transactionHeaderBytes = protobuf.TransactionHeader.encode({
      familyName: FAMILY_NAME,
      familyVersion: '1.0',
      inputs: inputAddressList,
      outputs: outputAddressList,
      signerPublicKey: this.signer.getPublicKey().asHex(),
      nonce: "" + Math.random(),
      batcherPublicKey: this.signer.getPublicKey().asHex(),
      dependencies: [],
      payloadSha512: hash(payloadBytes),
    }).finish();
    //Create a Transaction from the transaction header and payload above
    const transaction = protobuf.Transaction.create({
      header: transactionHeaderBytes,
      headerSignature: this.signer.sign(transactionHeaderBytes),
      payload: payloadBytes
    });
    const transactions = [transaction];
    //Create a BatchHeader from transactions above
    const batchHeaderBytes = protobuf.BatchHeader.encode({
      signerPublicKey: this.signer.getPublicKey().asHex(),
      transactionIds: transactions.map((txn) => txn.headerSignature),
    }).finish();
    const batchSignature = this.signer.sign(batchHeaderBytes);
    //Create a Batch using the Batch header and transactions above
    const batch = protobuf.Batch.create({
      header: batchHeaderBytes,
      headerSignature: batchSignature,
      transactions: transactions,
    });
    //Create Batch list from Batch above
    const batchListBytes = protobuf.BatchList.encode({
      batches: [batch]
    }).finish();
    //Send batch_list to the rest api
    this._send_to_rest_api(batchListBytes);
  }

  //submit batch with RestAPI
  _send_to_rest_api(batchListBytes) {
    const url = "http://rest-api-0:8008/";
    if (batchListBytes == null) {
      var geturl = url+'state/' + this.address
      return fetch(geturl, {
        method: 'GET',
      })
        .then((response) => response.json())
        .then((responseJson) => {
            var data = responseJson.data;
            let unit = 0
            if(data!=undefined) {
              unit = Buffer.from(data, 'base64').toString();
            }
            return unit;
        })
        .catch((error) => {
          console.error(error);
        });
    }
    else {
      fetch(url+'batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: batchListBytes
      })
        .then((response) => {response.json()})
        .then((responseJson) => {
          console.log(responseJson);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
}
module.exports.TradeClient = TradeClient;
