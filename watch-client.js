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
    b.bundle()
        .on('end', () => {
            console.log('success:');
            console.log({
                timestamp: new Date(),
                bundle: bundle
            });
        })
        .on('error', e => {
            console.error('error:');
            console.log(e);
        })
        .pipe(fs.createWriteStream(bundle));
}

b.on('update', onUpdate);

onUpdate();
