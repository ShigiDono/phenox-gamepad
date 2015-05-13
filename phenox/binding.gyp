{
  "targets": [
    {
      "target_name": "phenox",
      "sources": [ "main.cc" ],
        "libraries": [
            '/root/phenox/library/sobjs/pxlib.so'
        ],
        'include_dirs': [
            '/root/phenox/library/headers/',
"<!(node -e \"require('node-arraybuffer')\")"        ],
        'cflags': [
            '-g', '-lm', '`pkg-config --libs opencv`', '`pkg-config --cflags opencv`', '-fexceptions'
        ],
        'cflags_cc!': [
          '-fno-rtti', '-fno-exceptions'
        ],
        'conditions': [[ 'OS=="linux" or OS=="freebsd" or OS=="openbsd" or OS=="solaris"',
          {
            'cflags_cc!': ['-fno-rtti', '-fno-exceptions'],
            'cflags_cc+': ['-frtti'],
          }
        ]]
    }
  ]
}
