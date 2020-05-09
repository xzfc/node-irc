const fs = require('fs')
const rules_path = process.env.NODE_IRC_BLACKLIST

if (rules_path === undefined)
    console.error('X: NODE_IRC_BLACKLIST is undefined')

let old_stat = ""
let rules = []

function reload_rules() {
    try {
        let stat = fs.statSync(rules_path)
        stat = `size:${stat.size} mtime:${stat.mtime}`
        if (stat === old_stat)
            return
        old_stat = stat

        rules = fs.readFileSync(rules_path, 'utf8')
            .split('\n')
            .map((line, no) => [line.trim(), no+1])
            .filter(([line, _]) => line != '' && line.substr(0,2) != '//')
            .map(([line, no]) => ({
                chan: line.split(/\s+/)[0],
                re: new RegExp(line.split(/\s+/)[1]),
                no: no,
            }))
        console.log('X: new rules:', rules)
    } catch (e) {
        console.error('X: error while reloading rules:', e.stack)
        return
    }
}

module.exports = function(raw) {
    if (rules_path === undefined)
        return false

    reload_rules()

    if (!~['JOIN', 'PRIVMSG', 'PART', 'NICK'].indexOf(raw.command))
        return false
    let chan = raw.command == 'NICK' ? raw.args[0] : null

    for (let rule of rules) {
        if ((chan === rule.chan || chan === null) && raw.prefix.match(rule.re)) {
            console.log(`X: filtered '${raw.command}' from '${raw.prefix}' (rule ${rule.no})`)
            return true
        }
    }

    return false
}
