# RPS-Multiplayer
HW 7 - Firebase Rock, Paper Scissors multi-player game

I hope the instructions on the page are sufficient.

The intent is to be able to choose between more than one opponent. So if multiple players "Request a new game", each of them will have a request out on Firebase. Each player can either pick an Active Request by clicking an "Active Request" button, or they can request a new game.

Unfortunately, unacknowleged requests will sit on the Firebase queue. If someone makes a request, then refreshes the screen, the player it was intended for is no longer there (since the ID is generated each time a screen is initialize). Manual cleanup of the database might be necessary.

I did not implement a messaging system. I just ran out of time. But it would be pretty straightforward since the game is basically just using the database to send messages back and forth between the players. 

The steps to add a messaging system:
- Add HTML for a text area
- Add HTML for an input
- Allow user to type in input.
- When ENTER is pressed
  - display text in text area
  - send message to the connected opponent
  - display the the text in opponents text area

  In a couple of hours I could have that working since the message sending infrastructure is all in place for it.

  The display is pretty bland neutral gray. I would like to have been more stylish, but I'm happy to at least have what's there working pretty well.