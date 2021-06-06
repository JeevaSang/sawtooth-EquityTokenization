'use strict'
const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const {
  InvalidTransaction,
  InternalError
} = require('sawtooth-sdk/processor/exceptions')
const crypto = require('crypto')
const _hash = (x) => crypto.createHash('sha512').update(x).digest('hex').toLowerCase().substring(0, 64)
const MIN_VALUE = 0
const SW_FAMILY = 'equity-tokenization'
const SW_NAMESPACE = _hash(SW_FAMILY).substring(0, 6)
//function to obtain the payload obtained from the client
const _decodeRequest = (payload) =>
  new Promise((resolve, reject) => {
    payload = payload.toString().split(',')
    if (payload.length === 3) {
      resolve({
        action: payload[0],
        amount: payload[1],
        token: payload[2]
      })
    }
    else if (payload.length === 4) {
      resolve({
        action: payload[0],
        amount: payload[1],
        token: payload[2],
        toKey: payload[3]
      })
    }
    else {
      let reason = new InvalidTransaction('Invalid payload serialization')
      reject(reason)
    }
  })
//function to display the errors
const _toInternalError = (err) => {
  console.log(" in error message block")
  let message = err.message ? err.message : err
  throw new InternalError(message)
}
//function to set the entries in the block using the "SetState" function
const _setEntry = (context, address, stateValue) => {
  let dataBytes = _serialize(stateValue)
  let entries = {
    [address]: dataBytes
  }
  return context.setState(entries)
}

const _deserialize = (data) => {
  let newdata = '' + data
  let stateData = newdata.split('|').map(x => x.split(','))
  return new Map(stateData)
}

const _serialize = (stateMap) => {
  let stateStrs = []

  for (let [key, value] of stateMap) {
    stateStrs.push([key, value].join(','))
  }
  stateStrs.sort()
  console.log("Data before serilizing " + stateStrs)
  return Buffer.from(stateStrs.join('|'))
}

//function to make a allocate transaction
const makeAllocate = (context, address, amount, token, user) => (possibleAddressValues) => {
  let stateValueRep = possibleAddressValues[address]
  let newState = new Map()
  if (stateValueRep == null || stateValueRep == '') {
    console.log("No previous allocation, creating new allocation")
    newState.set(token, amount)
  }
  else {
    newState = _deserialize(stateValueRep)
    console.log("The oldstate :" + newState);
    let newAmount = (newState.get(token) ? parseInt(newState.get(token)) : 0) + amount
    newState.set(token, newAmount)
    console.log("Amount crediting:" + newState)
  }
  return _setEntry(context, address, newState)
}
//function to make a transfer transaction
const makeTransfer = (context, senderAddress, amount, token, receiverAddress) => (possibleAddressValues) => {
  if (amount <= MIN_VALUE) {
    throw new InvalidTransaction('Amount is invalid')
  }
  let senderBalance, receiverBalance, 
      senderState = new Map(), receiverState = new Map();
  let currentEntry = possibleAddressValues[senderAddress]
  let currentEntryTo = possibleAddressValues[receiverAddress]
  let senderNewBalance = 0
  let receiverNewBalance = 0
  if (currentEntry == null || currentEntry == '') {
    console.log("No user (debitor)")
  } else {
    senderState = _deserialize(currentEntry)
  }
    
  if (currentEntryTo == null || currentEntryTo == '') {
    console.log("No user (Creditor)")
  } else {
    receiverState = _deserialize(currentEntryTo)
  }
  
  senderBalance = (senderState.get(token)) ? parseInt(senderState.get(token)) : 0
  receiverBalance = (receiverState.get(token)) ? parseInt(receiverState.get(token)) : 0
  console.log("Sender old balance:" + senderBalance + ", Receiver old balance:" + receiverState.get(token))
  if (senderBalance < amount) {
    throw new InvalidTransaction("Not enough money to perform transfer operation")
  }
  else {
    console.log("Debiting amount from the sender:" + amount)
    senderNewBalance = senderBalance - amount
    receiverNewBalance = receiverBalance + amount
    senderState.set(token, senderNewBalance)
    receiverState.set(token, receiverNewBalance)
    _setEntry(context, senderAddress, senderState)
    console.log("Sender balance:" + senderNewBalance + ", Receiver balance:" + receiverNewBalance)
    return _setEntry(context, receiverAddress, receiverState)
  }
}
class TradeHandler extends TransactionHandler {
  constructor() {
    super(SW_FAMILY, ['1.0'], [SW_NAMESPACE])
  }
  //This apply function does most of the work for this class by
  //processing a transaction for the 'equity-tokenization' family
  apply(transactionProcessRequest, context) {
    //Extract the payload from the transaction
    return _decodeRequest(transactionProcessRequest.payload)
      .catch(_toInternalError)
      .then((update) => {
        let header = transactionProcessRequest.header
        //get the signer's public key from the transaction header
        let userPublicKey = header.signerPublicKey
        if (!update.action) {
          throw new InvalidTransaction('Action is required')
        }
        let amount = update.amount
        let token = update.token
        if (amount === null || amount === undefined) {
          throw new InvalidTransaction('Value is required')
        }
        amount = parseInt(amount)
        if (typeof amount !== "number" || amount <= MIN_VALUE) {
          throw new InvalidTransaction(`Value must be an integer ` + `no less than 1`)
        }
        // Perform the action
        let actionFn
        if (update.action === 'allocate') {
          actionFn = makeAllocate
        }
        else if (update.action === 'transfer') {
          actionFn = makeTransfer
        }
        else if (update.action === 'balance') {
          actionFn = showBalance
        }
        else {
          throw new InvalidTransaction(`Action must be create or take not ${update.action}`)
        }
        //Address is 6-char TF + hash of user public key
        let senderAddress = SW_NAMESPACE + _hash(userPublicKey).slice(-64)
        // this is the key obtained for the beneficiary in the payload , used only during transfer function
        let beneficiaryKey = update.toKey
        let receiverAddress
        if (beneficiaryKey != undefined) {
          receiverAddress = SW_NAMESPACE + _hash(update.toKey).slice(-64)
        }
        //Get the current state from context passing the address as a input
        //if no value is found at address, create a new state 
        //else update state for this address
        let getPromise
        if (update.action == 'transfer')
          getPromise = context.getState([senderAddress, receiverAddress])
        else
          getPromise = context.getState([senderAddress])
        let actionPromise = getPromise.then(
          actionFn(context, senderAddress, amount, token, receiverAddress)
        )
        return actionPromise.then(addresses => {
          if (addresses.length === 0) {
            throw new InternalError('State Error!')
          }
        })
      })
  }
}
module.exports = TradeHandler