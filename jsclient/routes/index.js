

var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var {TradeClient} = require('./TradeClient') 

var urlencodedParser = bodyParser.urlencoded({ extended: false })

router.get('/', function(req, res){
    res.redirect("/login");
})

//Get home view
router.get('/login', function(req, res){
    res.render('loginPage');
});

// Get Allocate view
router.get('/allocate',function(req, res){
    res.render('allocatePage');
})

//Get Transfer View
router.get('/transfer',function(req, res){
    res.render('transferPage');
})

//Get Balance View
router.get('/balance', function(req, res){
    res.render('balancePage');
})

//recieve data from login page and save it.
router.post('/login', urlencodedParser, function(req, res){
    var userid = req.body.userId;
    res.send({done:1, userId: userid, message: "User Successfully Logged in as "+userid  });
});

//function to allocate unit in server
router.post('/allocate', function(req, res) {
    var userId = req.body.userId;
    var unit = req.body.money;
    var token = req.body.token;
    var client = new TradeClient(userId); 
    client.allocate(unit,token);    
    res.send({message:"Amount "+ unit +" successfully added"});
});

//function to transfer money to another user
router.post('/transfer', function(req, res) {
    var userId = req.body.userId;
    var beneficiary = req.body.beneficiary;
    var unit = req.body.money;
    var token = req.body.token;
    var client = new TradeClient(userId);
    client.transfer(beneficiary, unit,token);    
    res.send({ message:"Amount "+ unit +" successfully added to " + beneficiary});
});

router.post('/balance', function(req, res){
    var userId = req.body.userId;
    var client = new TradeClient(userId);
    var getYourBalance = client.balance();
    console.log(getYourBalance);
    getYourBalance.then(result => {res.send({ balance: result, message:"Amount " + result + " available"});});
})
module.exports = router;
