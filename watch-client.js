import fs from 'fs';
import browserify from 'browserify';
import watchify from 'watchify';
import tsify from 'tsify';

const b = browserify({ cache: {}, packageCache: {}, debug: true })
    .add('src/client/lobby.ts')
    .add('src/client/game.ts')
    .plugin(tsify, { project: 'tsconfig.client.json' })
    .plugin(watchify);

const path = 'static/client.js';

function bundle() {
    let error = null;
    b.bundle()
        .on('end', () => {
            if (error !== null) {
                console.error(`failure:`);
                console.error(error);
            } else {
                console.log(`success:`);
                console.log({
                    timestamp: new Date(),
                    bundle: path
                });
            }
        })
        .on('error', e => {
            error = e;
        })
        .pipe(fs.createWriteStream(path));
}

b.on('update', bundle);

bundle();
