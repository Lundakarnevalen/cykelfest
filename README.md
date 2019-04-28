# cykelfest
En algoritm för att fördela cykelfest-deltagare i olika grupper om vilka man ska äta förrätt, huvudrätt och efterrätt tillsammans med.


## Run the program

The program takes the input from an csv file, located in the same folder as the index file. The headings in input csv should be the same as the input.csv.sample file, otherwise the mapping on lines 31-44 in index.js need modification.

Dependencies on node and npm.

1. npm install
2. npm start

The program will now try to find an optimal solution to this constraint problem. This means that the program most likely will perform hundred of thousands of iterations. And it will print to the command line for each 10.000 iterations. 

This may take a while depending on the complexity of the data provided. More groups means more combinations that can be tested, and more chance that two pairs will meet more then once. 

Also if the the check for same group is active, this further makes the selection harder. First the algorithm needs to find a solution that have that two pairs do not meet twice, for the solution that passes this criteria it also checks if any pairs on each meal is in the same group.

The 2018 bike party found around 20 correct distributions for the first criteria among 10.000 tries. And need 30.000.000 distribtuions to find 20 distribution that was correct with the group setting on. 

This means 1 in 500 makes the first critera and that 1 in 3000 of those meets the second one. This means that one distribution have 0.000067% chance to be correct. So this will obviously take a while. 

## Configuration

The problem is solved as a constraint problem. This produces a lot of different solutions that all are tested against each other by being given points. If the solution is deemed to break some of the basic rules(Not meet the same pair twice or meet people from the same group the) the solutions is discarded.

If the solution passes these checks, it is then assigned a number of points, depending on the configuration, found in the top of the index.js file. 

The values currently present is the ones found by Martin Johansson before the 2018 Dsek spring Bike Party and may be modified on your own risk ;)

