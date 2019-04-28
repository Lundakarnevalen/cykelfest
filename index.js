// Skapat av Christopher Nilsson (cNille @ github) för Lundakarnevalens cykelfest. 
// Vid frågor kontakta: c@shapeapp.se
// Små modifieringar av Martin Johansson (martinjohansson93 @ github)

const _ = require('lodash')
const json2csv = require('json2csv').Parser;
const parse = require('csv-parse/lib/sync')
const fs = require('fs')

/// Configuration data:
let successLimit = 20 // Number of solutions to find before stopping
const sameGroupCheckActive = false // This check that pairs from the same "groups" do not meet.

  // Points for the sizes of each meal.
const GROUPSIZE6OR7POINTS = 2
const GROUPSIZE5POINTS = -30
const GROUPSIZE4POINTS = -70
const GROUPSIZE8POINTS = -2
  
  // If the main course group size are three people. 
  // The bigger groups have bigger budget, and the main course is the most expensive meal
const MAINCOURSEFORGROUPSIZEOF3POINTS = 5

  // Makes people bike some distance, but not to much
const CHANGINGAREAONESPOINTS = 5 

// 1. Load all input data
let input = fs.readFileSync(__dirname + '/input.csv', 'utf-8');
let data = parse(input, { columns: true });
let allEntries = data.map(p => {
  return {
    'time': p['Tidstämpel'],
    'name': p['Namn 1 '],
    'email1': p['Email 1'],
    'name2': p['Namn 2'] + ', ' + p['Namn 3'],
    'email2': p['Email 2'] + ', ' + p['Email 3'],
    'size': p['Vi är så här många i vårt lilla gäng!'],
    'groups': p['Vilken nollningsgrupp'],
    'address': [p['Adress där maten ska förtäras / Address where the food will be served ']],
    'phone': p['Telefonnummer till deltagande / Phone number to all attending '],
    'foodpref': p['Matpreferenser? (specificera för vem, men ändå inte för vem se beskrivning) / Food preferences? (specify for who attending) '],
    'restrictions': p['Eventuella restriktioner:Ex) Jag har hund, kan endast vara hos mig efter 20, pälsallergiker'],
    'area': p['Stadsdel där maten ska förtäras / District where the food will be served ']
  }
})

// 2. Match all singles to pairs. 
// let [pairs, singles] = _.partition(allEntries, p => !!p.name2)
// for (let i = 0; i < singles.length; i += 2) {
//   let a = singles[i]
//   let b = singles[i + 1] || {}
//   let joined = {
//     'time': a.time,
//     'name': a.name,
//     'name2': b.name || '',
//     'address': a.address + ' ::: ' + (b.address || ''),
//     'phone': a.phone + ' ::: ' + (b.phone || ''),
//     'foodpref': a.foodpref + ' ::: ' + (b.foodpref || ''),
//     'area': b.area ? a.area.concat(b.area) : a.area,
//     'pepp': a.pepp
//   }
let pairs = []
allEntries.map(allEntrie => {
  pairs.push(allEntrie)
})



function createDistributionList() {
  // 3. Shuffle list of pairs
  pairs = _.shuffle(pairs)

  // 4. Create three meal lists. One for aptizer, one for the main course
  //    and one for the desert.
  //    A meal will contain a list of pairs. Where the first one is the host,
  //    and the others are the guests of the meal.
  let nbrOfDates = parseInt(pairs.length / 3)
  let meals = [
    [], // Aptizers
    [], // Maincourse
    [], // Desert
  ]
  // Set a pair (of attendees) as hosts for each meal
  for (let i = 0; i < pairs.length; i++) {
    if (meals[i % 3].length < nbrOfDates) {
      meals[i % 3].push([pairs[i]])
    } else {
      meals[i % 3][0].push(pairs[i])
    }
  }

  // 5. Fill all guests in all meal-list. One pair can only be en one meal-list 
  //    once. 
  meals.forEach((meal, i) => {
    let diff = _.difference(pairs, _.flatten(meal))
    diff = _.shuffle(diff)
    diff.forEach((d, idx) => {
      meals[i][idx % nbrOfDates].push(d)
    })
  })
  return meals
}
// 7. Evaluate function.
//    Cuz we randomize so we have to evaluate how good a distribution
//    is. 

function evaluate(mealList) {
  let points = 10000;
  // Penalty if two pair eat together twice.
  pairs.forEach(pair => {
    let attendees = mealList.reduce((acc, curr) => {
      let meal = curr.filter(c => _.indexOf(c, pair) >= 0)
      return acc.concat(meal)
    }, [])
    const guestCount = attendees.reduce((acc, curr) => acc + curr.length, 0)
    const set = new Set(_.flatten(attendees))

    // If size is less than 7, then two pair have eaten together twice
    // Remove 2 because of the duplicate of the pair in mealLists
    const limit = guestCount - 2
    if (set.size < limit) {
      points = -1
    }
  })
  if (points < 0) { // Dont allow this rule to be broken
    return points
  }

  // Check if people from the same group meet each other, in that case return -1
  if (sameGroupCheckActive) {
    let sameGroup = false
    mealList.forEach(meal => {
      meal.forEach(group => {
        if (group[0].groups === group[1].groups || group[0].groups === group[2].groups || group[1].groups === group[2].groups) {
          sameGroup = true
        }
      })
    })
    
    if (sameGroup) {
      points = -1
      return points
    }
  }
  // Select the group of the host
  // // Add points if all who eat desert together are grouped by afterparty.
  // let dessertSchedule = mealList[2]
  // dessertSchedule.forEach(ds => {
  //   let [after, noafter] = _.partition(ds, x => x.afterparty)
  //   if(after.length === 0 || noafter.length === 0){
  //     points += 1
  //   }
  // })

  // Add points if group size is right or only one 3 group
  let size = 0
  mealList.forEach(meal => {
    meal.forEach(group => {
      size = parseInt(group[0].size) + parseInt(group[1].size) + parseInt(group[2].size)
      if (size === 6 || size === 7) {
        points += GROUPSIZE6OR7POINTS
      }
      if (size === 8) {
        points -= GROUPSIZE8POINTS
      }
      if (size < 5) {
        points -= GROUPSIZE4POINTS
      }
      if (size < 6) {
        points -= GROUPSIZE5POINTS
      }
    })
  })

  const main = mealList[1]
  main.forEach(group => {
    if (parseInt(group[0].size) === 3) {
      points += MAINCOURSEFORGROUPSIZEOF3POINTS
    }
  })

  // Add points if people stay in same zone during all meals.
  pairs.forEach(pair => {
    let attendees = mealList.reduce((acc, curr) => {
      let meal = curr.filter(c => _.indexOf(c, pair) >= 0)
      return acc.concat(meal)
    }, [])
    let hosts = attendees.map(x => x[0])

    // Select the first area of the host as their selected area
    let areas = _.flatten(hosts.map(x => x.area[0]))

    let areaChange = 0
    for (let i = 0; i < areas.length - 2; i++) {
      if (areas[i] !== areas[i + 1]) {
        areaChange++
      }
    }
    // Add extra points if one swap zone ones.
    if (areaChange === 2) {
      points += CHANGINGAREAONESPOINTS
    }

    // Add point the fewer times a pair stays in same area
    points += areas.length - 1 - areaChange
  })
  if (points < 0) {
    return points
  }

  // // Add points if afterparty-people at dessert are in center-zone.
  // mealList.forEach(dl => {
  //   points += dl.reduce( (acc, curr) => {
  //     if(curr[0].afterparty && _.indexOf(curr[0].area, 'Centralt') >= 0){
  //       acc++
  //     }
  //     return acc
  //   }, 0)
  // })
  return points;
}

// 8. Iterate until the best distribution is found
let nbrSuccess = 0
let success = []
let iteration = 0
let points = 0
let topPoint = 0
let distribution = []
while (nbrSuccess < successLimit) {
  distribution = createDistributionList()

  points = evaluate(distribution)

  if (points > 0) {
    nbrSuccess += 1
    success.push([points, distribution])
    topPoint = Math.max(points, topPoint)
    console.log(`Success found. Nbr: ${nbrSuccess}, points: ${points}`)
  }

  iteration++
  if (iteration % 10000 === 0) {
    console.log(`Iteration ${iteration}`)
  }
}

// Sort list by points DESC
highscore = _.reverse(_.sortBy(success, x => x[0]))
console.log()
highscore.forEach((x, idx) => console.log(`${idx + 1}. ${x[0]} reached`))

console.log()
console.log()
console.log('Top Score', highscore[0][0])

// 9. Create output-files with best score
let topdistribution = highscore[0][1]
let apt = topdistribution[0]
let main = topdistribution[1]
let des = topdistribution[2]

const fields = [
  'host',
  'GuestPair1',
  'GuestPair2',
  'address',
  'Foodpref',
  'Host phone',
  'Emails',
  'Size of parTY'
];
const opts = { fields }

function getCsv(list) {
  let data = list.map(a => {
    host = a[0]
    g1 = a[1]
    g2 = a[2]
    g3 = a[3]
    foodpref = a.filter(x => x.foodpref).map(x => `${x.foodpref}`).join('\n')

    let obj = {
      host: host.name + ', ' + host.name2,
      address: host.address,
      GuestPair1: g1.name + ', ' + g1.name2,
      GuestPair2: g2.name + ', ' + g2.name2,
      GuestPair3: '-',
      'Host phone': host.phone,
      Foodpref: foodpref,
      Emails: host.email1 + ', ' + host.email2,
      'Size of parTY': parseInt(host.size) + parseInt(g1.size) + parseInt(g2.size)
    }
    if (g3) {
      obj.GuestPair3 = g3.name + ', ' + g3.name2
    }
    return obj
  })

  try {
    const parser = new json2csv(opts);
    const csv = parser.parse(data);
    return csv
  } catch (err) {
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
function writeCsv(csv, name) {
  var stream = fs.createWriteStream("scores/" + highscore[0][0] + "_" + name + ".csv");
  stream.once('open', function (fd) {
    stream.write(csv);
    stream.end();
  });
}