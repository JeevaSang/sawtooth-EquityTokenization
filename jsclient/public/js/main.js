

//Function to display the user details on the top right of the webpage
function getUserDetails() {
    var user = sessionStorage.getItem("userId");
    document.getElementById("userCredentials").innerHTML ="Welcome " + user.toUpperCase() + " |";
}  


window.addEventListener("load", function(event) 
{
	getUserDetails();
});

//Validate
function loginBtnClicked(event) {
    event.preventDefault();
    var userId = document.getElementById('loginId').value;
    if (userId == "") {
        alert("Please Enter User ID");
        window.location.href = '/login';
    } else {
        $.post('/login', { userId: userId },
        function (data, textStatus, jqXHR) {
            if (data.done == 1) {
                sessionStorage.clear();
                sessionStorage.setItem("userId" , data.userId);
                // some delay before redirecting to homepage
                // to allow sessionstorage to complete
                setTimeout(null, 101);
                alert(data.message);
                window.location.href = "/balance";
            } else {
                alert(data.message);
                window.location.href = "/login";
            }
        },'json');
    }
}

//Successful Logout
function logoutBtnClicked(){
    sessionStorage.clear();
    window.location.href = "/login";
    alert("Successfully Logged out");
}

//Function to allocate money to the specified user account
function allocateMoney() {
    var userDetails = sessionStorage.getItem('userId');
    var token = document.getElementById("token").value;
    var unit = document.getElementById("unit").value;
    if (unit.length === 0) {
        alert("Please enter some unit");
    } else {
        $.post('/allocate', { userId: userDetails, token: token, money: unit },
            function (data, textStatus, jqXHR) {
                window.location.href="/balance";
            },
            'json');
    }
}

//function to implement transfer function form client side
function transferMoney() {
    var userDetails = sessionStorage.getItem('userId');
    var beneficiary = document.getElementById('beneficiaryUserId').value;
    var token = document.getElementById("token").value;
    var unit = document.getElementById("transferAmt").value;
    if (unit.length === 0) {
        alert("Please enter unit");
	}
    if(beneficiary.length === 0){
        alert("Please Enter the beneficiary"); 
	}
    if(unit.length != 0 && beneficiary.length != 0) {
        $.post('/transfer', { userId: userDetails, beneficiary: beneficiary, money: unit, token: token },
            function (data, textStatus, jqXHR) {
                window.location.href="/balance";
            },
            'json');
    }
}

function showBalance() {
    $(".nav").find(".active").removeClass("active");
    $('#balance').addClass("active");    

    var userId = sessionStorage.getItem('userId');
    $.post('/balance', { userId: userId },
         function (data, textStatus, jqXHR) {
             let bal = 0;
                if (data.balance) {
                    bal = data.balance;
                }

                document.getElementById("balanceCheck").innerHTML ="Your balance is:" + "<br />" + bal;
                 
            },
            'json'); 
}

function homePageLoaded() {
    $(".nav").find(".active").removeClass("active");
    $('#home').addClass("active");    
}


function transferPageLoaded() {
    $(".nav").find(".active").removeClass("active");
    $('#transfer').addClass("active");    
}

function allocatePageLoaded() {
    $(".nav").find(".active").removeClass("active");
    $('#allocate').addClass("active");    
}
