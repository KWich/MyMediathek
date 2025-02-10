'use strict';
module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

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
            dest: '/server',
            src: [
              "**//*.py",
              "**//*.js",
              "**//*.html",
              "**//*.css",
              "**//*.svg",
              "**//*.png",
              "**//*.yaml"
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
            dest: '/scripts',
            src: [
              "*.requirements",
              "*.service-*",
              "templates/*",
              "support/*"
            ],
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
            dest: '/scripts',
            src: [
              "*Service.sh",
              "uninstall.sh",
              "start.sh",
              "my*.sh",
              "update*.sh",
              "suche*.sh"
            ],
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
            dest: '/src',
            src: [
              "**//*.py",
              "**//*.js",
              "**//*.html",
              "**//*.css",
              "**//*.svg",
              "**//*.png",
              "**//*.yaml",
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
            dest: '/scripts',
            src: [
              "*.requirements",
              "templates/*"
            ],
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

    // update version information (ref: https://www.npmjs.com/package/grunt-replace)
    replace: {
      "ver-1": {
        options: {
          patterns: [
            {
              match: /Vx.x/g,
              replacement: "<%= pkg.version %> (<%= grunt.template.today('dd/mm/yyyy') %>)"
            }
          ]
        },
        files: [
          {
            expand: true,
            src: [
              "scripts/**//*.sh",
              "scripts/**//*.bat"
            ],
            dest: 'release/tmp'
          }
        ]
      },
      "ver-2": {
        options: {
          patterns: [
            {
              match: /CONST_VERSION = ".+"/g,
              replacement: "CONST_VERSION = \"<%= pkg.version %> (<%= grunt.template.today('dd/mm/yyyy') %>)\""
            }
          ]
        },
        files: [
          {
            expand: true,
            src: [
              "src/server/__init__.py"
            ]
          }
        ]
      },
      "ver-3": {
        options: {
          patterns: [
            {
              match: /cVERSION=".+"/g,
              replacement: "cVERSION=\"<%= pkg.version %> (<%= grunt.template.today('dd/mm/yyyy') %>)\""
            }
          ]
        },
        files: [
          {
            expand: true,
            src: [
              "scripts/mymediathek.sh"
            ]
          }
        ]
      }
    },

    clean: {
      build: ['release/tmp'],
      release: ['release/tmp'],
    },

    run: {
      options: {
      },
      pylint: {
        cmd: 'pylint',
        args: [
          './src'
        ]
      }
    },

  });

  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-stylelint');
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('default',
                      [ 'clean:build',
                        'run:pylint',
                        'eslint',
                        'stylelint',
                        'replace',
                        'compress:linux',
                        'clean:release',
                      ]
                     );
  grunt.registerTask('zip', ['clean:build', 'replace', 'compress:windows', 'clean:release']);
  grunt.registerTask('tar', ['clean:build', 'replace', 'compress:linux', 'clean:release']);
  grunt.registerTask('lint', ['eslint','run:pylint','stylelint']);
  grunt.registerTask('pylint', ['run:pylint']);
}
