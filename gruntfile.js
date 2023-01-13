'use strict';
module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    //banner: '/*\n <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> \n*/\n'

    eslint: {
      options: {
        fix: grunt.option('fix')
      },
      target: ['src/**/*.js']
    },

    // https://stylelint.io/
    stylelint: {
      css: {
        options: {
            configFile: '.stylelintrc',
            format: 'css'
        },
        src: [ 'src/**/*.css' ]
      },
    },

    // make a zipfile ref https://github.com/gruntjs/grunt-contrib-compress
    compress: {
      linux: {
        options: {
          archive: 'release/<%= pkg.name %>-linux.tgz',
          mode: 'tgz'
        },
        files: [
          {
            cwd: 'src/',
            dest: 'server/',
            src: [
              "**//*.html",
              "**//*.css",
              "**//*.svg",
              "**//*.png",
              "**//*.yaml",
              "**//*.xpi",
            ],
            expand: true
          },
          {
            cwd: 'release/tmp/src',
            dest: '/server',
            src: [
              "**/*"
            ],
            expand: true
          },
          {
            cwd: 'scripts/',
            src: [
              "*.requirements",
              "*.service-*",
            ],
            dest: '/scripts',
            expand: true
          },
          {
            dest: '/',
            src: [
              "LICENSE.txt",
              "release/tmp/scripts/install.sh",
            ],
            expand: true,
            flatten: true
          },
          {
            cwd: 'release/tmp/scripts/',
            src: [
              "*Service.sh",
              "uninstall.sh",
              "start.sh",
              "my*.sh",
            ],
            dest: 'scripts/',
            expand: true
          },
        ]
      },

      windows: {
        options: {
          archive: 'release/<%= pkg.name %>-win.zip',
          mode: 'zip'
        },
        files: [
          {
            cwd: 'src/',
            dest: 'src/',
            src: [
              "**//*.html",
              "**//*.css",
              "**//*.svg",
              "**//*.png",
              "**//*.yaml",
              "**//*.xpi",
            ],
            expand: true
          },
          {
            cwd: 'release/tmp/src',
            dest: '/src',
            src: [
              "**/*"
            ],
            expand: true
          },
          {
            cwd: 'scripts/',
            src: [
              "*.requirements",
            ],
            dest: '/scripts',
            expand: true
          },
          {
            dest: '/',
            src: [
              "LICENSE.txt",
              "release/tmp/scripts/start.bat",
            ],
            expand: true,
            flatten: true
          },
        ]
      },

    },

    replace: {
      build: {
        options: {
          patterns: [
            {
              match: /Vx.x/g,
              replacement: "<%= pkg.version  %> (<%= grunt.template.today('dd/mm/yyyy') %>)"
            }
          ]
        },
        files: [
          {
            expand: true,
            src: [
              "src/**//*.py",
              "src/**//*.js",
              "scripts/**//*.sh",
              "scripts/**//*.bat"
            ],
            dest: 'release/tmp'
          }
        ]
      }
    },

    clean: {
      build: ['release/tmp', 'release/*.tgz'],
      release: ['release/tmp'],
    },

  });

  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks( 'grunt-stylelint' );

  grunt.registerTask('default',
                      [ 'clean:build',
                        'eslint',
                        'stylelint',
                        'replace',
                        'compress',
                        'clean:release']
                     );
  grunt.registerTask('zip', ['clean:build', 'replace', 'compress:windows', 'clean:release']);
  grunt.registerTask('tar', ['clean:build', 'replace', 'compress:linux', 'clean:release']);
  grunt.registerTask('lint', ['eslint']);
}