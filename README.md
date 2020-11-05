Dixit
======

This is the main repository for the web Dixit implementation I've built. The game is (currently) playable at [https://web.ma.utexas.edu/users/weisman/dixit/](https://web.ma.utexas.edu/users/weisman/dixit/).

## Components

The game is built out of:

1. A server, currently hosted by Heroku at [https://dixit-for-bibas.herokuapp.com/](https://dixit-for-bibas.herokuapp.com/).
2. A web client, hosted at [https://web.ma.utexas.edu/users/weisman/dixit/](https://web.ma.utexas.edu/users/weisman/dixit/).
3. Some scripts to automate the process of adding new cards to the game.

The server is maintained as a separate git submodule, also hosted on GitHub (so that it can easily be deployed to Heroku).

## Warnings

- This code is pretty brittle, since I'm a crummy JavaScript programmer and an even crummier node.js programmer. Catching SQL errors is for losers (a.k.a. good programmers)
- The server is hosted on Heroku with a free plan, so I have a limited amount of uptime per month
- There's no server-side validation of incoming messages from the client, so it's totally possible to write an alternative client to really gum up the database or crash the server
- It's quite easy to reset the database remotely, so nefarious users can easily kill your game using built-in functionality
- The client logs basically everything, so if you keep an eye on the logs it's very easy to cheat at the game
- the rules of Dixit are probably copyrighted so this could get me into some trouble

## Card credits

Card illustrators:

- Rok Gregoric
- Teddy Weisman
- Neža Žager Korenjak
- Casandra Monroe
- Arun Debray

Additional card image sources:

- *Topology and Geometry*, Glen Bredon
- *Bug on notes of Thurston*, Jeff Brock and David Dumas
- Works of Salvador Dalí
- *Homotopical Topology*, Anatoly Fomenko and Dmitry Fuchs
- the letters of Alexander Grothendieck
- *Knots and Links*, Dale Rolfsen
- *A Comprehensive Introduction to Differential Geometry*, Michael Spivak
- *Geometry and Topology of 3-manifolds*, William Thurston

If you'd like to submit cards for the game, email me at [tjweisman@gmail.com](mailto:tjweisman@gmail.com).