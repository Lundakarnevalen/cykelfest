const _ = require('lodash')
const json2csv = require('json2csv').Parser;
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
let successLimit = 1000
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
    console.log(`Success found. Nbr: ${nbrSuccess}, points: ${points}`)
  }

  iteration++
  if(iteration % 10000 === 0){
    console.log(`Iteration ${iteration}`)
  }
}

// Sort list by points DESC
highscore = _.reverse(_.sortBy(success, x => x[0]))
highscore.forEach( (x, idx) => console.log(`${idx+1}. ${x[0]} reached`))

console.log()
console.log('Top Score', highscore[0][0])

// 9. Create output-files with best score

let topdates = highscore[0][1]
let apt = topdates[0]
let main = topdates[1]
let des = topdates[2]

const fields = [
  'host', 
  'address', 
  'area', 
  'GuestPair1',
  'GuestPair2',
  'GuestPair3',
  'Foodpref',
  'Host phone',
  'Guest1 phone',
  'Guest2 phone',
  'Guest3 phone',
  'Afterparty Host',
  'Afterparty Guest1',
  'Afterparty Guest2',
  'Afterparty Guest3',
];
const opts = { fields }

function getCsv(list){
  let data = list.map(a => {
    host = a[0]
    g1 = a[1]
    g2 = a[2]
    g3 = a[3]
    foodpref = a.filter(x => x.foodpref).map( x => `${x.foodpref}`).join(' och ')
    let obj = {
      host: host.name + ' och ' + host.name2,
      address: host.address,
      area: host.area.join(', '),
      GuestPair1: g1.name + ' och ' + g1.name2,
      GuestPair2: g2.name + ' och ' + g2.name2,
      GuestPair3: '-',
      'Host phone': host.phone,
      'Guest1 phone': g1.phone,
      'Guest2 phone': g2.phone,
      'Afterparty Host': host.afterparty,
      'Afterparty Guest1': g1.afterparty,
      'Afterparty Guest2': g2.afterparty,
      'Foodpref': foodpref,
    }
    if(g3){
      obj.GuestPair3 = g3.name + ' och ' + g3.name2
      obj['Afterparty Guest3'] = g3.afterparty
      obj['Guest3 phone'] = g3.phone
    }
    return obj
  })

  try{
    const parser = new json2csv(opts);
    const csv = parser.parse(data);
    return csv
  } catch (err ){
    console.error(err);
    return err
  }
}

apt_csv = getCsv(apt)
main_csv = getCsv(main)
des_csv = getCsv(des)

writeCsv(apt_csv, 'apt')
writeCsv(main_csv, 'main')
writeCsv(des_csv, 'dessert')
function writeCsv(csv, name){
  var stream = fs.createWriteStream("scores/" + highscore[0][0]  + "_" + name + ".csv");
  stream.once('open', function(fd) {
    stream.write(csv);
    stream.end();
  });
}
