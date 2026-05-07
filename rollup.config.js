import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { writeFileSync } from 'fs';
import copy from 'rollup-plugin-copy';
import css from 'rollup-plugin-css-only';
import livereload from 'rollup-plugin-livereload';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import path from 'path';

const mode = process.env.NODE_ENV;
const production = mode === 'production';

const preprocess = sveltePreprocess({
	postcss:  {
		plugins: [
			require('postcss-import'),
			require('tailwindcss'),
			require('autoprefixer'),
			...(production ? [require('postcss-clean')] : []),
		],
	},
	defaults: {
		style: 'postcss',
	},
});

export default {
	input:   'src/main.js',
	output:  {
		file:      'dist/bundle.js',
		sourcemap: !production,
		name:      'app',
		format:    'iife',
	},
	plugins: [
		copy({
			targets: [
				{ src: 'src/template.html', dest: 'dist', rename: 'index.html' },
				{ src: 'static/**/*', dest: 'dist' },
			],
		}),

		svelte({
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production,
			},

			// preprocess svelte files
			preprocess,
		}),

		css({
			output: !production ? 'bundle.css' : (styles, styleNodes) => {
				for (let filename of Object.keys(styleNodes)) {
					if (filename.endsWith('App.css')) {
						writeFileSync('./dist/critical.css', styleNodes[filename]);
					}
				}

				writeFileSync('./dist/bundle.css', styles);
			},
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe:  ['svelte'],
			alias: {
				'@sudoku/constants': path.resolve(__dirname, 'src/constants.js'),
				'@sudoku/sencode': path.resolve(__dirname, 'src/sencode.js'),
				'@sudoku/game': path.resolve(__dirname, 'src/game.js'),
				'@sudoku/stores/grid': path.resolve(__dirname, 'src/stores/grid.js'),
				'@sudoku/stores/cursor': path.resolve(__dirname, 'src/stores/cursor.js'),
				'@sudoku/stores/candidates': path.resolve(__dirname, 'src/stores/candidates.js'),
				'@sudoku/stores/notes': path.resolve(__dirname, 'src/stores/notes.js'),
				'@sudoku/stores/hints': path.resolve(__dirname, 'src/stores/hints.js'),
				'@sudoku/stores/game': path.resolve(__dirname, 'src/stores/game.js'),
				'@sudoku/stores/timer': path.resolve(__dirname, 'src/stores/timer.js'),
				'@sudoku/stores/modal': path.resolve(__dirname, 'src/stores/modal.js'),
				'@sudoku/stores/difficulty': path.resolve(__dirname, 'src/stores/difficulty.js'),
				'@sudoku/stores/settings': path.resolve(__dirname, 'src/stores/settings.js'),
				'@sudoku/stores/keyboard': path.resolve(__dirname, 'src/stores/keyboard.js'),
			}
		}),
		commonjs(),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `dist` directory and refresh the
		// browser on changes when not in production
		!production && livereload({
			watch: ['dist/bundle.js', 'dist/bundle.css'],
                     host: '0.0.0.0',
		}),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser(),
	],
	watch:   {
		clearScreen: false,
	},
};

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev', '--host', '0.0.0.0'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true,
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		},
	};
}
