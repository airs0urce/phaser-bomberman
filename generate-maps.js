const fs = require('fs');
const path = require('path');

const MAPS_DIR = path.join(__dirname, 'src', 'maps');
const W = 'W', B = 'B', G = 'G';

const tilesetGids = {
    1: { [B]: 1, [G]: 2, [W]: 3 },
    2: { [B]: 4, [G]: 5, [W]: 6 },
    3: { [B]: 7, [G]: 8, [W]: 9 },
    4: { [B]: 10, [G]: 11, [W]: 12 },
};

function parseLayout(strings) {
    const layout = strings.map(s => s.split(''));
    // Validate
    if (layout.length !== 13) throw new Error(`Expected 13 rows, got ${layout.length}`);
    for (let y = 0; y < 13; y++) {
        if (layout[y].length !== 15) throw new Error(`Row ${y} has ${layout[y].length} cols, expected 15`);
    }
    // Validate spawn areas
    if (layout[1][1] !== G || layout[1][2] !== G || layout[2][1] !== G) {
        throw new Error('P1 spawn area not clear');
    }
    if (layout[11][13] !== G || layout[11][12] !== G || layout[10][13] !== G) {
        throw new Error('P2 spawn area not clear');
    }
    return layout;
}

function layoutToBase64(layout, tilesetId) {
    const gidMap = tilesetGids[tilesetId];
    const gids = [];
    for (const row of layout) {
        for (const cell of row) {
            gids.push(gidMap[cell]);
        }
    }
    const buf = Buffer.alloc(gids.length * 4);
    gids.forEach((g, i) => buf.writeUInt32LE(g, i * 4));
    return buf.toString('base64');
}

// Read map3.json as template
const template = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, 'map3.json'), 'utf8'));

function createMapJson(base64Data, name) {
    const map = JSON.parse(JSON.stringify(template));
    map.editorsettings.export.target = `${name}.json`;
    map.layers[0].data = base64Data;
    return JSON.stringify(map, null, 1);
}

// 10 map layouts: levels 3-12
const maps = [
    {
        name: 'level3', tileset: 3,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBBBBBBBBBGGW',
            'WGWBWBWBWBWBWGW',
            'WBBBBBBBBBBBBBW',
            'WBWBWBWBWBWBWBW',
            'WBBBBBBBBBBBBBW',
            'WBWBWBWBWBWBWBW',
            'WBBBBBBBBBBBBBW',
            'WBWBWBWBWBWBWBW',
            'WBBBBBBBBBBBBBW',
            'WGWBWBWBWBWBWGW',
            'WGGBBBBBBBBBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level4', tileset: 4,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBBBGBGBBBGGW',
            'WGWBWGWBWGWBWGW',
            'WBBGGBGGBGGBBBW',
            'WBWGWBWGWBWGWBW',
            'WBGGGBGGGBGGGBW',
            'WBWGWGWGWGWGWBW',
            'WBGGGBGGGBGGGBW',
            'WBWGWBWGWBWGWBW',
            'WBBGGBGGBGGBBBW',
            'WGWBWGWBWGWBWGW',
            'WGGBBBGBGBBBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level5', tileset: 1,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGGGGGGGGGGGGW',
            'WGWWWBWWWBWWWGW',
            'WGBBBBBGBBBBBGW',
            'WGWBWBWGWBWBWGW',
            'WGBBBBBGBBBBBGW',
            'WGWWWBWGWBWWWGW',
            'WGBBBBBGBBBBBGW',
            'WGWBWBWGWBWBWGW',
            'WGBBBBBGBBBBBGW',
            'WGWWWBWWWBWWWGW',
            'WGGGGGGGGGGGGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level6', tileset: 2,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBBBBGBBBBGGW',
            'WGWBWBWGWBWBWGW',
            'WBBBBBBGBBBBBBW',
            'WBWBWGGGGGWBWBW',
            'WBBGGGGGGGGGGBW',
            'WGWGGGGWGGGGWGW',
            'WBBGGGGGGGGGGBW',
            'WBWBWGGGGGWBWBW',
            'WBBBBBBGBBBBBBW',
            'WGWBWBWGWBWBWGW',
            'WGGBBBBGBBBBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level7', tileset: 3,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBBBBBBBBBGGW',
            'WGWGWWWBWWWGWGW',
            'WGGGGGBBBGGGBBW',
            'WBWWWGWBWGWWWBW',
            'WBGGGGBGBGGGGBW',
            'WBWBWGGGGGWBWBW',
            'WBGGGGBGBGGGGBW',
            'WBWWWGWBWGWWWBW',
            'WBBGGGBBBGGGGGW',
            'WGWGWWWBWWWGWGW',
            'WGGBBBBBBBBBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level8', tileset: 4,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBBGGGGGBBGGW',
            'WGWBWBWBWBWBWGW',
            'WBBBBBBGBBBBBBW',
            'WBWBWBWGWBWBWBW',
            'WGBBBBGGGBBBBGW',
            'WGWBWGWGWGWBWGW',
            'WGBBBBGGGBBBBGW',
            'WBWBWBWGWBWBWBW',
            'WBBBBBBGBBBBBBW',
            'WGWBWBWBWBWBWGW',
            'WGGBBGGGGGBBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level9', tileset: 1,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBGBGBGBGBGGW',
            'WGWGWGWBWGWGWGW',
            'WBGBGBGGGBGBGBW',
            'WGWGWGWBWGWGWGW',
            'WBGBGBGGGBGBGBW',
            'WGWGWBWGWBWGWGW',
            'WBGBGBGGGBGBGBW',
            'WGWGWGWBWGWGWGW',
            'WBGBGBGGGBGBGBW',
            'WGWGWGWBWGWGWGW',
            'WGGBGBGBGBGBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level10', tileset: 2,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGGGGGGGGGGGGW',
            'WGWBWGWBWGWBWGW',
            'WGBGBGGGGGBGBGW',
            'WGWBWGWGWGWBWGW',
            'WGGGGGGGGGGGGGW',
            'WGWGWGWWWGWGWGW',
            'WGGGGGGGGGGGGGW',
            'WGWBWGWGWGWBWGW',
            'WGBGBGGGGGBGBGW',
            'WGWBWGWBWGWBWGW',
            'WGGGGGGGGGGGGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level11', tileset: 3,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBGBGBGBGBGGW',
            'WGWBWBWBWBWBWGW',
            'WBBGBGBGBGBGBBW',
            'WGWBWBWBWBWBWGW',
            'WBBGBGGGGGBGBBW',
            'WGWBWGWGWGWBWGW',
            'WBBGBGGGGGBGBBW',
            'WGWBWBWBWBWBWGW',
            'WBBGBGBGBGBGBBW',
            'WGWBWBWBWBWBWGW',
            'WGGBGBGBGBGBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
    {
        name: 'level12', tileset: 4,
        layout: [
            'WWWWWWWWWWWWWWW',
            'WGGBBBBBBBBBGGW',
            'WGWBWBWBWBWBWGW',
            'WBBBBBBBBBBBBBW',
            'WBWBWBWBWBWBWBW',
            'WBBBBBBBBBBBBBW',
            'WBWBWBWGWBWBWBW',
            'WBBBBBBBBBBBBBW',
            'WBWBWBWBWBWBWBW',
            'WBBBBBBBBBBBBBW',
            'WGWBWBWBWBWBWGW',
            'WGGBBBBBBBBBGGW',
            'WWWWWWWWWWWWWWW',
        ]
    },
];

// Generate all maps
for (const mapDef of maps) {
    const layout = parseLayout(mapDef.layout);
    const base64 = layoutToBase64(layout, mapDef.tileset);
    const json = createMapJson(base64, mapDef.name);
    const filePath = path.join(MAPS_DIR, `${mapDef.name}.json`);
    fs.writeFileSync(filePath, json);
    console.log(`Generated ${mapDef.name}.json (tileset ${mapDef.tileset})`);
}

console.log('Done! Generated 10 map files.');
