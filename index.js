const _ = require('lodash')
const parse = require('csv-parse/lib/sync')
const fs = require('fs')


// 1. Load all input data
let input = fs.readFileSync(__dirname+'/input.csv', 'utf-8');
let data = parse(input, {columns: true});
let allEntries = data.map(p => {
  return {
    'time': p['Tidstämpel'],
    'name': p['Namn'],
    'attend': p['Jag vill anmäla mig'],
    'name2': p['(Om anmälan sker i par) - Jag vill anmäla mig tillsammans med'],
    'address': p['Adress där måltiden ska förtäras'],
    'phone': p['Telefonnummer till båda i paret (tydligt vems som är vems)'],
    'afterparty': p['Jag/Vi vill ha förköp till Malmös?'].startsWith('Ja'),
    'iam': p['Jag är'],
    'foodpref': p['Matpreferenser på dig/på någon i paret?'],
    'area': [p['Jag bor (lättare för oss då vi ska försöka minimera cykelsträckan)']],
    'pepp': p['ÄR DU TAGGAD?!??!']
  }
})

// 2. Match all singles to pairs. 
let [pairs, singles] = _.partition(allEntries, p => !!p.name2)
for(let i = 0; i < singles.length; i+=2){
  let a = singles[i]
  let b = singles[i+1] || {}
  let joined = {
    'time': a.time,
    'name': a.name,
    'attend': a.attend,
    'name2': b.name || '',
    'address': a.address + ' ::: ' + (b.address || ''),
    'phone': a.phone + ' ::: ' + (b.phone || ''),
    'afterparty': b.afterparty || a.afterparty,
    'iam': a.iam,
    'foodpref': a.foodpref + ' ::: ' + (b.foodpref || ''),
    'area': b.area ? a.area.concat(b.area) : a.area,
    'pepp': a.pepp
  }
  pairs.push(joined)
}


function createDateLists(){
  // 3. Shuffle list of pairs
  pairs = _.shuffle(pairs)

  // 4. Create three date lists. One for aptizer, one for the main course
  //    and one for the desert.
  let nbrOfDates = parseInt(pairs.length / 3)
  let dates = [
    [], // Aptizers
    [], // Maincourse
    [], // Desert
  ]
  for(let i = 0; i < pairs.length; i++){
    if(dates[i%3].length < nbrOfDates){
      dates[i%3].push([pairs[i]])
    } else {
      dates[i%3][0].push(pairs[i])
    }
  } 

  // 5. Fill all dates in all date-list. One pair can only be en one date-list 
  //    once. 
  dates.forEach( (date, i) => {
    let diff = _.difference(pairs, _.flatten(date))
    diff = _.shuffle(diff)
    diff.forEach( (d, idx) => {
      dates[i][idx%nbrOfDates].push(d)
    })
  })  
  return dates
}
// 7. Evaluate function.
//    Cuz we randomize so we have to evaluate how good a distribution
//    is. 

function evaluate(datelists){
  let points = 10;
  
  // Penalty if two pair eat together twice.
  pairs.forEach(pair => {
    let attendees = datelists.reduce( (acc, curr) => {
      let meal = curr.filter( c => _.indexOf(c, pair) >= 0 )
      return acc.concat(meal)
    }, [])
    let set = new Set(_.flatten(attendees))

    // If size is less than 7, then two pair have eaten together twice
    if(set.size < 7){
      points = -1
    }
  })
  if(points < 0){
    return points
  }

  // Add points ifall in same dessert are grouped by afterparty.
  let dessertSchedule = datelists[2]
  dessertSchedule.forEach(ds => {
    let [after, noafter] = _.partition(ds, x => x.afterparty)
    if(after.length === 0 || noafter.length === 0){
      points += 1
    }
  })

  // Add points if people stay in same zone.
  pairs.forEach(pair => {
    let attendees = datelists.reduce( (acc, curr) => {
      let meal = curr.filter( c => _.indexOf(c, pair) >= 0 )
      return acc.concat(meal)
    }, [])
    let hosts = attendees.map(x => x[0])
    let areas = _.flatten(hosts.map(x => x.area))
    let areaSet = new Set(areas)

    points += (2 - areaSet.size)    
  })
  if(points < 0){
    return points
  }

  // Add points if people at dessert are in center-zone.
  datelists.forEach(dl => {
    points += dl.reduce( (acc, curr) => {
      if(curr[0].afterparty && _.indexOf(curr[0].area, 'Centralt') >= 0){
        acc++
      }
      return acc
    }, 0)
  })

  return  points;
}

// 8. Iterate until the best distribution is found
let nbrSuccess = 0
let success = []
let successLimit = 10
let iteration = 0
let points = 0
let topPoint = 0
let dates = []
while(nbrSuccess < successLimit){
  dates = createDateLists() 
  points = evaluate(dates)

  if(points > 0){
    nbrSuccess += 1
    success.push([points, dates])
    topPoint = Math.max(points, topPoint)
  }

  iteration++
  if(iteration % 1000 === 0){
    console.log(`Iteration ${iteration}`)
  }
}
console.log(`Success! ${points} reached`)
success.forEach(x => console.log(`Success! ${x[0]} reached`))

// 9. Create output-files with best score

