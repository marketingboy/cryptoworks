const bodyParser    =   require('body-parser');
const express       =   require('express');
const request       =   require('request');
const path          =   require('path');
const Blockchain    =   require('./blockchain');
const PubSub        =   require('./app/pubsub'); 
const TransactionPool   =   require('./wallet/transaction-pool');
const Wallet        =   require('./wallet');
const TransactionMiner  =   require('./app/transaction-miner');

const isDevelopment = process.env.ENV === 'development';

const REDIS_URL = isDevelopment ?
    'redis://127.0.0.1:6379' :
    'redis://h:pceb73561f4d5b2995ab0ae008932a92629b6cd77473646829f69f76618eaccf0@ec2-3-81-176-153.compute-1.amazonaws.com:6999'
const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;


const app           =   express();
const blockchain    =   new Blockchain();
const transactionPool   =   new TransactionPool();
const wallet        =   new Wallet();
const pubsub        =   new PubSub({ blockchain, transactionPool, redisUrl: REDIS_URL });
const transactionMiner  =   new TransactionMiner({ blockchain, transactionPool, wallet, pubsub });




app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('/api/blocks', (req, res) => {
    res.json(blockchain.chain);
});

app.post('/api/mine', (req, res) => {
    const { data } = req.body;

    blockchain.addBlock({ data });
    pubsub.broadcastChain();
    res.redirect('/api/blocks');
});

app.post('/api/transact', (req, res) => {
    const { amount, recipient }     =   req.body;
    let transaction = transactionPool.existingTransaction({ inputAddress: wallet.publicKey });
    try{
        if(transaction){
            transaction.update({ senderWallet: wallet, recipient, amount });
        }else{
            transaction = wallet.createTransaction({ recipient, amount, chain: blockchain.chain });
        }
        
    }catch(error){
        return res.status(400).json({type: 'error', message: error.message});
    }
    
    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction)
    res.json({type: 'success', transaction });

});

app.get('/api/transaction-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap);
});

app.get('/api/mine-transactions', (req, res) => {
    transactionMiner.mineTransactions();
    res.redirect('/api/blocks');
});

app.get('/api/wallet-info', (req, res) => {
    const address = wallet.publicKey;
    res.json({
        address,
        balance: Wallet.calculateBalance({ chain: blockchain.chain, address })
    });
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html')); 
});
const syncWithRootState = () => {
    request({ url: `${ROOT_NODE_ADDRESS}/api/blocks` }, (error, response, body) => {
        if(!error && response.statusCode === 200)
        {
            const rootChain = JSON.parse(body);
            console.log('replace chain on a syn with', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });

    request({ url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map`}, (error, response, body) => {
        if(!error && response.statusCode === 200){
            const rootTransactionPoolMap = JSON.parse(body);

            console.log('replace transaction pool map on a sync with', rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
};

if(isDevelopment){
    const walletFoo = new Wallet();
    const walletBar = new Wallet();

    const generateWalletTransaction = ({ wallet, recipient, amount }) => {

        const transaction = wallet.createTransaction({
            recipient, amount, chain: blockchain.chain
        });

        transactionPool.setTransaction(transaction); 
    };

    const walletAction = () => generateWalletTransaction({
        wallet, recipient: walletFoo.publicKey, amount: 5
    });


    const walletFooAction = () => generateWalletTransaction({
        wallet: walletFoo, recipient: walletBar.publicKey, amount: 10
    });

    const walletBarAction = () => generateWalletTransaction({
        wallet: walletBar, recipient: wallet.publicKey, amount: 15
    });

    for (let i = 0; i< 10; i++){
        if(i%3 === 0){
            walletAction();
            walletFooAction();

        }else if (i%3 === 1){
            walletAction();
            walletBarAction();
        }else{
            walletFooAction();
            walletBarAction();
        }

        transactionMiner.mineTransactions();
    }
}
let PEER_PORT;

if(process.env.GENERATE_PEER_PORT === 'true')
{
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}
const PORT = process.env.PORT || PEER_PORT || DEFAULT_PORT;

app.listen(PORT, () => {
    console.log(`The app is listening at localhost:${PORT}`);
    if(PORT !== DEFAULT_PORT)
    {
        syncWithRootState();
    }
    

});