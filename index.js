// Skapat av Christopher Nilsson (cNille @ github) för Lundakarnevalens cykelfest.
// Vid frågor kontakta: c@shapeapp.se
const _ = require('lodash')
const Json2csv = require('json2csv').Parser
const parse = require('csv-parse/lib/sync')
const fs = require('fs')
const path = require('path')

// 1. Load all input data
let input = fs.readFileSync(path.join(__dirname, '/inputdata.csv'), 'utf-8')
let data = parse(input, {columns: true})
let allEntries = data.map(p => {
  return {
    'time': p['Tidstämpel'],
    'name': p['Namn / Name'],
    'attend': p['Jag vill anmäla mig / I want to attend'],
    'name2': p['Jag vill anmäla mig tillsammans med; / I want to attend with;'],
    'address': p['Adress där maten ska förtäras / Address where the food will be served'],
    'phone': p['Telefonnummer till deltagande / Phone number to all attending'],
    'afterparty': p['Vill ni ha förköp till VGs? / Do you want tickets to VGs? (60 kr)'].startsWith('Ja'),
    'iam': p['Jag är'],
    'foodpref': p['Matpreferenser? (specificera för vem) / Food preferences? (specify for who attending) '],
    'area': [p['Stadsdel där maten ska förtäras / District where the food will be served']],
    'pepp': p['How excited are you???']
  }
})

// 2. Match all singles to pairs.
let [pairs, singles] = _.partition(allEntries, p => !!p.name2)
for (let i = 0; i < singles.length; i += 2) {
  let a = singles[i]
  let b = singles[i + 1] || {}
  let joined = {
    'time': a.time,
    'name': a.name,
    'attend': a.attend,
    'name2': b.name || '',
    'address': a.address,
    'phone': a.phone + ' ::: ' + (b.phone || ''),
    'afterparty': b.afterparty || a.afterparty,
    'iam': a.iam,
    'foodpref': a.foodpref + ' ::: ' + (b.foodpref || ''),
    'area': a.area, // Just take the first ones area
    'pepp': a.pepp
  }
  pairs.push(joined)
}

function createDistributionList () {
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
    [] // Desert
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

function evaluate (mealList) {
  let points = 40

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

  // Add points if all who eat desert together are grouped by afterparty.
  let dessertSchedule = mealList[2]
  dessertSchedule.forEach(ds => {
    let [after, noafter] = _.partition(ds, x => x.afterparty)
    points += Math.abs(after.length - noafter.length) * 2
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
    // console.log(areas)
    for (let i = 0; i < areas.length - 1; i++) {
      if (areas[i] !== areas[i + 1]) {
        areaChange++
        // console.log(areas[i], areas[i+1])
      }
    }
    // console.log(areaChange)
    // Add point the fewer times a pair stays in same area
    const areaScore = 2 - (areaChange * 2)
    points += areaScore
  })
  if (points < 0) {
    return points
  }

  // Add points if afterparty-people at dessert are in center-zone.
  mealList.forEach(dl => {
    points += dl.reduce((acc, curr) => {
      if (curr[0].afterparty && _.indexOf(curr[0].area, 'Österort / East') >= 0) {
        acc++
      }
      return acc
    }, 0)
  })
  return points
}

// 8. Iterate until the best distribution is found
let nbrSuccess = 0
let success = []
let successLimit = 200
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
const highscore = _.reverse(_.sortBy(success, x => x[0]))
console.log()
highscore.forEach((x, idx) => console.log(`${idx + 1}. ${x[0]} reached`))

console.log()
console.log()
console.log('Top Score', highscore[0][0])

// 9. Create output-files with best score

// Top distributions to save
for (let i = 0; i < 3; i++) {
  console.log(`Printing ${i} ...`)
  let topdistribution = highscore[i][1]
  let score = highscore[i][0]
  outputdistribution(topdistribution, score)
}

function outputdistribution (distribution, score) {
  let apt = distribution[0]
  let main = distribution[1]
  let des = distribution[2]

  const fields = [
    'course',
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
    'Afterparty Guest3'
  ]
  const opts = { fields }

  function getCsv (list, course) {
    let data = list.map(a => {
      const host = a[0]
      const g1 = a[1]
      const g2 = a[2]
      const g3 = a[3]
      const foodpref = a.filter(x => x.foodpref).map(x => `${x.foodpref}`).join(' och ')
      let obj = {
        course: course,
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
        'Foodpref': foodpref
      }
      if (g3) {
        obj.GuestPair3 = g3.name + ' och ' + g3.name2
        obj['Afterparty Guest3'] = g3.afterparty
        obj['Guest3 phone'] = g3.phone
      }
      return obj
    })

    try {
      const parser = new Json2csv(opts)
      const csv = parser.parse(data)
      return csv
    } catch (err) {
      console.error(err)
      return err
    }
  }

  const aptCsv = getCsv(apt, 'Förrätt')
  const mainCsv = getCsv(main, 'Huvudrätt')
  const desCsv = getCsv(des, 'Efterrätt')

  var stream = fs.createWriteStream('scores/' + score + '.csv')
  stream.once('open', function (fd) {
    stream.write(aptCsv)
    stream.write(mainCsv)
    stream.write(desCsv)
    stream.end()
  })
}
