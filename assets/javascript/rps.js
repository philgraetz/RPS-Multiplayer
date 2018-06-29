
// This is mine (Phil's) account
const MY_FB_CONFIG = {
    apiKey: "AIzaSyCzjRoL7-gClXCQpsvyS_fblhRvw8Q_pfI",
    authDomain: "myfirstfirebase-b22f0.firebaseapp.com",
    databaseURL: "https://myfirstfirebase-b22f0.firebaseio.com",
    projectId: "myfirstfirebase-b22f0",
    storageBucket: "myfirstfirebase-b22f0.appspot.com",
    messagingSenderId: "430924788032"
};
const RPS = new RPSPlayer();

// DOCUMENT READY
function documentReady() {
    $("#play-container").hide();

    RPS.initialize();
    $("#name-ok").on("click", nameOkCB);
    $("#new-game-button").on("click", newGameCB);
    $(document).on("click", ".active-request-button", activeRequestCB);
    $(document).on("unload", documentUnload);
    $(".my-choice-text").on("click", choiceButtonCB);
}
function documentUnload() {
    localStorage.setItem("event", "UNLOAD");
    // console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
}

// DOM Element Callbacks
function nameOkCB() {
    // console.log("name-ok");
    let pname = $("#player-name").val();
    // console.log("name: " + pname);
    if (pname === "") {
        alert("You must enter a name");
        return;
    }
    $(this).prop("disabled", true);
    $("#player-name").prop("disabled", true);

    // Call the RPS method for this
    // (set up DB, etc)
    RPS.nameOk(pname);
}

function newGameCB() {
    // console.log("new-game-button");
    RPS.newGame();
}

function activeRequestCB() {
    let pname = $(this).data("name");
    let reqRef = $(this).data("request-ref");
    let newGameReqRefId = $(this).data("new-game-req-ref-id");
    // console.log("active-request-button " + pname);
    RPS.activeRequest(pname, reqRef, newGameReqRefId);
}

function choiceButtonCB() {
    let choice = $(this).attr("id");
    // console.log("pressed button " + choice);
    $(this).addClass("chosen-one");
    RPS.makeChoice(choice);
}

function newRoundTimerCB() {
    // console.log("newRoundTimerCB fired");
    RPS.newRound();
}

function getRandomId() {
    // 6 character string 000001 to 999999
    let x = Math.floor(Math.random() * 999999) + 1;
    let id = x.toString();
    id = "0".repeat(6 - id.length) + id;
    return id;
}

let currentMessageId = 0;
function getNewMessageId() {
    // 6 digit # from 1 to 999999
    let n = (++currentMessageId).toString();
    return "0".repeat(6 - n.length) + n;
}

// ===================
// Player Id prototype
// ===================
function PlayerId(playerName) {
    this.name = playerName;
    this.id = getRandomId();
    this.receive_ref = this.name + "_" + this.id;
    // console.log("I am " + this.receive_ref);
}

// ===================
// Message prototype
// ===================
function Message(type, purpose, sent_by) {
    this.type = type; // "request" or "reply"
    this.purpose = purpose; // "NEW_GAME", "RPS_CHOICE", etc.
    this.id = getNewMessageId();
    this.sent_by = sent_by;
    this.status = 0;
    this.status_msg = "OK";
}

// ====================
// RPS Player prototype
// ====================
function RPSPlayer() {
    // Initialize the RPS player object
    this.initialize = function () {
        this.myId = null;
        this.reqId = null;
        this.opponentId = null;
        this.lockSent = false;
        this.lockReceived = false;
        this.checksumReceived = null;
        this.myChoiceObject = "";
        this.opponentChoiceObject = "";
        this.timerId = null;
        this.myScore = { W : 0, L : 0, T : 0 };
        this.opponentScore = { W : 0, L : 0, T : 0 };
        this.setState("INITIAL");
    };

    // We got a name for this player
    this.nameOk = function (name) {
        // console.log("nameOK name: [" + name + "]");
        this.myId = new PlayerId(name);
        this.startDB();

        // Now we have a name, so we can do this
        $("#new-game-button").prop("disabled", false);
    }

    // Start the DB
    this.startDB = function () {
        // Initialize database and create a refernce to it.
        firebase.initializeApp(MY_FB_CONFIG);
        this.database = firebase.database();

        // Where NEW GAME requests are sent and received
        this.newGameRef = this.database.ref("RPS_NEW_GAME_REQUEST");

        // Where we receive requests
        this.receiveRef = this.database.ref(this.myId.receive_ref);

        // New game request callback
        this.newGameRef.on("value", RPS.newGameRequest);
        this.receiveRef.on("value", RPS.receive);
    };
    
    // Determine if you won, lost, or tied
    this.judge = function(p1, p2) {
                let R = "rock";
        let P = "paper";
        let S = "scissors";
        let W = "Won";
        let L = "Lost";
        let T = "Tied";
        //     p1     p2 p1-result
        wlt = { R : { R : T ,
                      P : L ,
                      S : W },
                P : { R : W ,
                      P : T ,
                      S : L },
                S : { R : L ,
                      P : W ,
                      S : T }
              };
        let s1 = p1.charAt().toUpperCase();
        let s2 = p2.charAt().toUpperCase();
        return wlt[s1][s2];
    };

    this.addScore = function(p1, p2, scoreObj) {
        let key = this.judge(p1, p2).charAt(0);
        scoreObj[key] = scoreObj[key] + 1;
        return scoreObj;
    };

    // Sent my choice, and received opponents choice.
    // Now compare them
    this.compareChoices = function () {
        let myChoice = this.myChoiceObject.choice;
        let opponentChoice = this.opponentChoiceObject.choice;
        // console.log("===== You chose " + myChoice + " =====");
        // console.log("===== Opponent chose " + opponentChoice + " =====");

        $("#opponent-rock").html("&nbsp;");
        $("#opponent-paper").html("&nbsp;");
        $("#oppenent-scissors").html("&nbsp;");
        let oppId = "#opponent-" + opponentChoice;
        $(oppId).html(opponentChoice.toUpperCase());
        $(oppId).addClass("chosen-one");

        let youDid = this.judge(myChoice, opponentChoice);
        this.myScore = this.addScore(myChoice, opponentChoice, this.myScore);
        this.opponentScore = this.addScore(opponentChoice, myChoice, this.opponentScore);

        $("#your-result").text(`You ${youDid}!`);
        $("#my-score").text(`${this.myScore.W}-${this.myScore.L}-${this.myScore.T}`)
        $("#opponent-score").text(`${this.opponentScore.W}-${this.opponentScore.L}-${this.opponentScore.T}`)

        this.setState("END_OF_ROUND");
    };

    this.newRound = function() {
        // Ensure the timer is cleared
        if (this.timerId != null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        // Start a new round
        this.setState("CONNECTED");
    };

    this.setState = function(state) {
        this.state = state;
        // console.log("Setting state to " + state);
        if (state === "INITIAL") {
            // Until we have a name
            $("#new-game-button").prop("disabled", true);
        } else if (state === "CONNECTED") {
            // Re-initialize these values
            this.lockSent = false;
            this.lockReceived = false;
            this.checksumReceived = null;
            this.myChoiceObject = "";
            this.opponentChoiceObject = "";
    
            // Show/hide/enable as needed
            $("#my-name").text(this.myId.name);
            $("#opponent-name").text(this.opponentId.name);
            $("#connection-container").hide();
            $("#play-container").show();

            $("#new-game-button").prop("disabled", true);
            $(".active-request-button").prop("disabled", true);

            $("#your-result").html("&nbsp");
            $("#opponent-rock").html("&nbsp;");
            $("#opponent-paper").html("?");
            $("#opponent-scissors").html("&nbsp;");

            $(".choice-text").removeClass("chosen-one");
            
        } else if (state === "LOCKING") {
            $(".my-choice-text").prop("disabled", true);
        } else if (state === "CHOICE_SENT") {
            //
        } else if (state === "END_OF_ROUND") {
            // Set a timer to keep display for a few seconds
            // Then go to state "CONNECTED" and do another round...
            if (this.timerId != null) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            // console.log("Setting newRoundTimerCB");
            this.timerId = setTimeout(newRoundTimerCB, 5000);
        }
    }

    // Called when another players sends me a message
    this.receive = function (snapshot) {
        values = snapshot.val();
        for (let reqId in values) {
            // console.log("<==== Received message reqId: " + reqId);
            msg = values[reqId];
            // console.log(msg);

            // Request
            if (msg.type === "request") {

                // Someone has accepted my new game request
                if (msg.purpose === "ACCEPT") {
                    // Save the oppenent's ID
                    RPS.opponentId = msg.sent_by;

                    // Send them a reply
                    response = new Message("reply", "ACCEPT", RPS.myId);
                    response.response_to = msg;
                    // console.log("Attempt ref to: " + msg.sent_by.receive_ref);

                    // Where we send requests/responses
                    RPS.sendRef = RPS.database.ref(msg.sent_by.receive_ref);

                    // console.log("===> Sending reply to ACCEPT (on next line:");
                    // console.log(response);
                    RPS.sendRef.push(response);

                    // Connected...
                    RPS.setState("CONNECTED");

                    // Delete the NEW_GAME request after we've replied to an ACCEPT
                    // console.log("removing id " + msg.new_game_req_ref_id);
                    RPS.newGameRef.child(msg.new_game_req_ref_id).remove(function () {
                        // console.log("remove complete");
                    })
                        .then(function () {
                            // console.log("Remove succeeded." + msg.new_game_req_ref_id);
                        })
                        .catch(function (error) {
                            // console.log("Remove failed: " + error.message);
                        });
                }

                // We received a CHECKSUM (a lock on the choice)
                else if (msg.purpose === "CHECKSUM") {
                    RPS.checksumReceived = msg.checksum;
                    // Send them a reply
                    response = new Message("reply", "CHECKSUM", RPS.myId);
                    response.response_to = msg;
                    // console.log(response);

                    // console.log("===> Sending reply to CHECKSUM (on next line:");
                    // console.log(response);
                    RPS.sendRef.push(response);

                    RPS.lockReceived = true;

                    // console.log("lockSent: " + RPS.lockSent + " lockReceived: " + RPS.lockReceived);
                    if (RPS.lockSent && RPS.lockReceived) {
                        RPS.sendChoice();
                    }
                }

                else if (msg.purpose === "CHOICE") {
                    // Validate the checksum hasn't changed
                    if (RPS.checksumReceived != msg.choice.checksum) {
                        alert("Checksums don't match");
                    }
                    else {
                        let newHash = RPS.hashCode(msg.choice.date, msg.choice.choice);
                        if (newHash !== RPS.checksumReceived) {
                            alert("It appears the choice has been changed");
                        }
                    }
                    RPS.opponentChoiceObject = msg.choice;
                    RPS.compareChoices();
                }
            }

            // Reply
            else {
                // console.log("Reply")
                // console.log(msg);
                if (msg.purpose === "ACCEPT") {
                    if (parseInt(msg.status) === 0) {
                        // All went well..
                        // Save the oppenent's ID
                        RPS.opponentId = msg.sent_by;

                        RPS.setState("CONNECTED");
                    }
                    else {
                        alert("Your ACCEPT request went wong somewhere");
                    }
                }
            }
            // Delete the message after having received it.
            // console.log("removing id " + reqId);
            RPS.receiveRef.child(reqId).remove(function () {
                // console.log("remove complete");
            })
                .then(function () {
                    // console.log("Remove succeeded." + reqId);
                })
                .catch(function (error) {
                    // console.log("Remove failed: " + error.message);
                });
        }
    };

    // Called when RPS_NEW_GAME_REQUEST gets a new value
    // (Or when DB is first started)
    this.newGameRequest = function (snapshot) {
        // console.log(snapshot.val());
        // console.log("newGameRequest state: " + RPS.state);
        values = snapshot.val();
        // console.log(values);
        for (let reqId in values) {
            // console.log("reqId: " + reqId);
            let sent_by = values[reqId].sent_by;
            if (sent_by.id === RPS.myId.id) {
                // console.log("Found a request sent by me");
                this.reqId = reqId;
                $("#new-game-button").prop("disabled", true); // don't allow more requests
            }
            let alreadyGotButton = false;
            $(".active-request-button").each(function () {
                // console.log("button child: " + $(this).data("sent-by-id"));
                if ($(this).data("sent-by-id") === sent_by.id) {
                    // Already got a button for this request
                    // console.log("already got button for " + sent_by.id);
                    alreadyGotButton = true;
                }
            });

            if (!alreadyGotButton) {
                let name = values[reqId].sent_by.name;
                // console.log("active request by [" + name + "]" + " id " + sent_by.id);
                let btn = $("<button>");
                btn.addClass("btn btn-secondary btn-sm active-request-button");
                btn.text(name);
                btn.data("name", name);
                btn.data("sent-by-id", sent_by.id);
                btn.data("request-ref", sent_by.receive_ref);
                btn.data("new-game-req-ref-id", reqId);
                if (sent_by.id === RPS.myId.id) {
                    // This is my request, so I should not be able to click it.
                    btn.prop("disabled", true);
                }
                $("#active-request-group").append(btn);
            }
        }
        if (RPS.state !== "INITIAL") {
            // All these buttons are enabled only until CONNECTED
            $("#new-game-button").prop("disabled", true);
            $(".active-request-button").prop("disabled", true);
        }
    };

    // Player clicked "Request a new game"
    // Send a new game request
    this.newGame = function () {
        // console.log("this.newGame this: " + this.FLAG);
        // console.log("this.myId " + this.myId);
        msg = new Message("request", "NEW_GAME", this.myId);

        // console.log("===> Sending request NEW_GAME");
        // console.log(msg);
        this.newGameRef.push(msg);
    };

    // Player clicked on active request button
    // Send "ACCEPT"
    this.activeRequest = function (name, reqRef, newGameReqRefId) {
        // console.log("this.activeRequest(" + name + ")");
        msg = new Message("request", "ACCEPT", this.myId);
        msg.new_game_req_ref_id = newGameReqRefId;
        this.sendRef = this.database.ref(reqRef);

        // console.log("===> Sending request ACCEPT");
        // console.log(msg);
        this.sendRef.push(msg);
    }

    this.hashCode = function (date, choice) {
        let str = date + choice;
        let hash = 0;
        if (str.length == 0) return hash;
        for (i = 0; i < str.length; i++) {
            char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    // A choice was made
    this.makeChoice = function (choice) {
        // If not in state CONNECTED, ignore mouse clicks here
        if (this.state !== "CONNECTED") {
            // console.log(this.state + " Ignoring click on " + choice);
            return;
        }
        // We've made our choice, disable the buttons now

        // First we will create a checksum and send it
        // This locks us (and our opponent) in to this choice
        // preventing either of us from making the choice
        // *after* the opponent's choice is received.
        date = (new Date()).getTime();
        checksum = this.hashCode(date.toString(), choice);
        // console.log("date: " + date + " choice: " + choice + " checksum: " + checksum);
        this.myChoiceObject = {
            date: date,
            choice: choice,
            checksum: checksum,
        };

        // Now send just the checksum
        msg = new Message("request", "CHECKSUM", this.myId);
        msg.checksum = checksum;

        // console.log("===> Sending request CHECKSUM");
        // console.log(msg);
        this.sendRef.push(msg);

        this.setState("LOCKING");
        this.lockSent = true;

        // console.log("lockSent: " + RPS.lockSent + " lockReceived: " + RPS.lockReceived);
        if (this.lockSent && this.lockReceived) {
            this.sendChoice();
        }
    }

    this.sendChoice = function () {
        msg = new Message("request", "CHOICE", this.myId);
        msg.choice = this.myChoiceObject;

        // console.log("===> Sending request CHOICE");
        // console.log(msg);
        this.sendRef.push(msg);

        this.setState("CHOICE_SENT");
    }
};
