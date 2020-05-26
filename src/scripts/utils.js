
const random = require('random');

module.exports =  {
    rand(min, max) {
        return random.int(min, max);
    }
}