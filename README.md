# sawtooth-PrivatEquityTokenization
A simple sawtooth "private equity tokenization" Usecase (processor + client)

**Introduction**

This is a usecase built using sawtooth application. This usecase demonstrates, where a customer allocates/transfers token and check balance from a wallet account.

A customer can:
1. allocate tokens into his/her wallet account
2. check the balance in the wallet account
3. transfer tokens from his/her wallet account to another

The customer is identified by a customer name and a corresponding public key. The wallet token balance, is stored at an address, derived from SHA 512 hash of customer's public key.

**Client**

The client is also written in Javascript using node.js. The `app.js` is the main javascript file from where the `main` function call occurs. Handlebars are used for templating, client related CSS and JavaScript code is written in public folder and server related files are written in `router/` folder. Running the default `docker-compose.yaml` file or the `multinodes-dynamic-consensus.yaml` launches the client, which is accessible at `localhost:3000`. 

How to use the Private Equity Tokenization UI:

1. Build and start the Docker containers:

    `docker-compose -f multinodes-dynamic-consensus up`

2. Open bash shell in `equity-tokenization-client` container:

    `docker exec -it equity-tokenization-client bash`

3. Create user accounts for jeeva and rai:

    `sawtooth keygen jeeva && sawtooth keygen rai`

4. Open two new browser tabs and go to `http://localhost:3000` on each tab

5. Login in one tab as `jeeva` , in other as `rai`  

6. Start with an initial allocation for each user - jeeva , rai via the `Allocate` tab in the UI homepage

------

# Dynamic consensus

Dynamic Hyperledger Sawtooth that is able to change consensus dynamically through a code, Sawtooth has two consensus protocols, including PoET and PBFT.

4 sawtooth nodes started and joined into one network. PBFT consensus is set by default. The repo includes 2 shell scripts which sets PBFT and PoET consensus accordingly.

**Test consensus**

- Check the current consensus is set to PBFT :

        root@9074ddc8c412:/project/equity-tokenization# sawtooth settings list --url http:// rest-api-0:8008
        sawtooth.consensus.algorithm.name: pbft
        sawtooth.consensus.algorithm.version: 1.0

- Connect to the shell docker container :

        docker exec -it equity-tokenization-client bash

- Change active consensus to PoET :    

        root@9074ddc8c412:/project/equity-tokenization# sh set_poet_consensus.sh
        root@9074ddc8c412:/project/equity-tokenization# sawtooth settings list --url http://rest-api-0:8008
        `sawtooth.consensus.algorithm.name: poet
        sawtooth.consensus.algorithm.version: 0.1

- Change active consensus to PBFT again :

        root@9074ddc8c412:/project/equity-tokenization# sh set_pbft_consensus.sh
        root@9074ddc8c412:/project/equity-tokenization# sawtooth settings list --url http://    rest-api-0:8008
        sawtooth.consensus.algorithm.name: pbft
        sawtooth.consensus.algorithm.version: 1.0
