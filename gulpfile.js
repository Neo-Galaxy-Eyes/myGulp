const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')

//创建一个开放服务器
const browserSync = require('browser-sync')
const bs = browserSync.create()

//加载全部plugins
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()

const data = {
  menus: [
    {
      name: 'Home',
      icon: 'aperture',
      link: 'index.html'
    },
    {
      name: 'Features',
      link: 'features.html'
    },
    {
      name: 'About',
      link: 'about.html'
    },
    {
      name: 'Contact',
      link: '#',
      children: [
        {
          name: 'Twitter',
          link: 'https://twitter.com'
        },
        {
          name: 'About',
          link: 'https://weibo.com'
        },
        {
          name: 'divider'
        },
        {
          name: 'About',
          link: 'https://github.com'
        }
      ]
    }
  ],
  pkg: require('./package.json'),
  date: new Date()
}

//自定义文件清除任务，返回的是一个promise
const clean = () => {
  return del(['dist', 'temp'])
}

const style = () => {
  //base指定src，输出资源目录结构就会与'assets/styles/*.scss'一致
  return src('src/assets/styles/*.scss', { base: 'src' })
    //指定expanded，使生成css样式的时候，里面的花括号完全展开
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest('temp'))
    //流的流动触发了服务器重新加载页面
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src('src/assets/scripts/*.js', { base: 'src' })
    //@babel/core只负责转换过程，别忘了还需要手动安装@babel/preset-env
    .pipe(plugins.babel({ presets: ['@babel/preset-env'] }))
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  //如果文件的其他地方也有html的转换需求，可以这样写：'src/**/*.html'
  return src('src/*.html', { base: 'src' })
    //使用data来填充html的数据占位
    .pipe(plugins.swig({ data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src('src/assets/images/**', { base: 'src' })
    //这里也可以对svg进行处理
    .pipe(plugins.imagemin())
    .pipe(dest('dist'))
}

const font = () => {
  return src('src/assets/fonts/**', { base: 'src' })
    .pipe(plugins.imagemin())
    .pipe(dest('dist'))
}

const extra = () => {
  return src('public/**', { base: 'public' })
    .pipe(dest('dist'))
}

const serve = () => {
  //监听更改，触发任务
  watch('src/assets/styles/*.scss', style)
  watch('src/assets/scripts/*.js', script)
  watch('src/*.html', page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  //图片字体等资源在上线之前构建一次即可
  watch([
    'src/assets/images/**',
    'src/assets/fonts/**',
    'public/**'
  ], bs.reload)

  bs.init({
    //不需要浏览器弹出提示
    notify: false,
    port: 2080,
    // open: false,
    // files: 'dist/**', //dist文件夹下面的内容被更改，就会触发热更新
    server: {
      baseDir: ['temp', 'src', 'public'],
      //会优先请求routes里面的路径
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src('temp/*.html', { base: 'temp' })
    //沿着路径，抽离注释，找到文件，压缩文件，返回文件
    .pipe(plugins.useref({ searchPath: ['temp', '.'] }))
    //压缩 html js css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      //处理空白字符和换行符
      collapseWhitespace: true,
      //压缩html内部的css和js
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest('dist'))
}

const compile = parallel(style, script, page)

// 上线之前执行的任务
const build =  series(
  clean, //先清理文件
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )//后处理文件
)

//先编译文件，后开启服务器
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}
