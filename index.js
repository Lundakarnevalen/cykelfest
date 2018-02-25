const _ = require('lodash')
const parse = require('csv-parse')
const fs = require('fs')


// 1. Load all input data
var parser = parse({delimiter: ','}, function(err, data){
  console.log(data);
});

fs.createReadStream(__dirname+'/input.csv').pipe(parser);


// 2. Match all singles to pairs. 


// (2.5 Give each pair a ID.)



// 3. Shuffle list of pairs




// 4. Create three date lists. One for aptizer, one for the main course
//    and one for the desert.




// 5. Fill all dates in all date-list. One pair can only be en one date-list 
//    once. 


// 7. Evaluate function.
//    Cuz we randomize in step 5 so we have to evaluate how good a distribution
//    is. 

function evaluate(datelists){






}



