import fs from 'fs';
import browserify from 'browserify';
import watchify from 'watchify';
import tsify from 'tsify';

const b = browserify({ cache: {}, packageCache: {}, debug: true })
    .add('src/client/main.ts')
    .plugin(tsify, { project: 'tsconfig.client.json' })
    .plugin(watchify);

const bundle = 'www/script.js';

function onUpdate() {
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
                    bundle: bundle
                });
            }
        })
        .on('error', e => {
            error = e;
        })
        .pipe(fs.createWriteStream(bundle));
}

b.on('update', onUpdate);

onUpdate();
