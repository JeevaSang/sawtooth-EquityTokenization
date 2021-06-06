
'use strict'

const { TransactionProcessor } = require('sawtooth-sdk/processor')
const TradeHandler = require('./TradeHandler')

if (process.argv.length < 3) {
  console.log('missing a validator address')
  process.exit(1)
}

const address = process.argv[2]
//TransactionProcessor class is given the address to connect with the validator
const transactionProcessor = new TransactionProcessor(address)

transactionProcessor.addHandler(new TradeHandler())

transactionProcessor.start()
