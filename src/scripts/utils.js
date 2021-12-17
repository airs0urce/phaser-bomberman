
const random = require('random').default;

module.exports =  {
    rand(min, max) {
        return random.int(min, max);
    }
}