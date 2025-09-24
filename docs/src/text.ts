import { fonts } from 'modern-font'
import {
  Camera2D,
  Element2D,
  Engine,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  msaa: true,
  antialias: true,
})

engine.root.append(new Camera2D())

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/fallback.woff' })

  engine.root.append([
    new Element2D({
      style: {
        left: 10,
        top: 100,
        width: 800,
        height: 500,
        fontSize: 100,
        textDecoration: 'underline',
        opacity: 0.3,
        backgroundColor: '#FF00FFFF',
        borderRadius: 10,
      },
      text: {
        content: [
          {
            fragments: [
              {
                content: 'Highhhh',
              },
              {
                content: 'lig',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUxLjM2NDYgNDUuODY0MkM0OS43ODA4IDQ2LjI3ODIgNDcuOTA2IDQ2LjcwNSA0NS44NTg4IDQ3LjA4NTdNNDUuODU4OCA0Ny4wODU3QzM0LjE2NDkgNDkuMjYwNyAxNi44NDg2IDQ5LjkzNDMgMTYuMDI3NyAzOC4xNDg0QzE1LjIyIDI2LjU1MzMgMzIuMjY0IDIyLjM2MzYgNDUuNjEzNSAyNC41NjI2QzUzLjYwMSAyNS44NzgzIDU3LjQ1MDcgMjkuNjIwOCA1Ny45Mjg1IDM0LjIzN0M1OC4yODExIDM3LjY0MzUgNTUuNzc4IDQzLjM3MDIgNDUuODU4OCA0Ny4wODU3Wk00NS44NTg4IDQ3LjA4NTdDNDIuMzM2NyA0OC40MDUxIDM3Ljg3OTUgNDkuNDcwOCAzMi4yODMgNTAuMDg5MSIgc3Ryb2tlPSIjRkZDMzAwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
              },
              {
                content: 'ht',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjkyNzcgNDcuMzU4OUg1My4wMDc4IiBzdHJva2U9IiM3MUUzNUIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSIwLjEgOCIvPgo8L3N2Zz4K',
              },
            ],
          },
          {
            fragments: [
              {
                content: 'High',
              },
              {
                content: 'ligh',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjkyNzcgNDcuMzU4OUg1My4wMDc4IiBzdHJva2U9IiM3MUUzNUIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSIwLjEgOCIvPgo8L3N2Zz4K',
              },
              {
                content: 't',
              },
            ],
          },
          {
            fragments: [
              {
                content: 'Highlig',
              },
              {
                content: 'ht',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQyLjE2MDIgMzcuMTk0TDUxLjQ5NDkgMzAuNzc5MUM1MS41MTgxIDMwLjc2MzIgNTEuNTU0MSAzMC43ODAzIDUxLjUzODEgMzAuODAzNEM1MC4zODQ4IDMyLjQ2NTEgMzYuMDQzOSA1My4zNzQ4IDU2LjAyMDIgMzcuMTk0TTQyLjE1ODggMzcuMTk0QzIyLjE4MjYgNTMuMzc0OCAzNi41MjM1IDMyLjQ2NTEgMzcuNjc2OCAzMC44MDM0QzM3LjY5MjggMzAuNzgwMyAzNy42NTY3IDMwLjc2MzIgMzcuNjMzNiAzMC43NzkxTDI4LjI5ODggMzcuMTk0QzguMzIyNTggNTMuMzc0OCAyMi42NjQxIDMyLjQ2NTEgMjMuODE3NCAzMC44MDM0QzIzLjgzMzQgMzAuNzgwMyAyMy43OTc0IDMwLjc2MzIgMjMuNzc0MiAzMC43NzkxTDE0LjQzOTUgMzcuMTk0IiBzdHJva2U9IiM4OERBRjkiIHN0cm9rZS13aWR0aD0iOC44MiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
              },
            ],
          },
        ],
      },
    }),
    new Element2D({
      style: {
        fontSize: 100,
        left: 800,
        top: 100,
        width: 800,
      },
      text: {
        outline: {
          color: '#00FF00',
          width: 2,
        },
        content: '一乙二十丁厂七卜人入八九几儿了力乃刀又三干亏士工土才寸下丈与万上小口巾山千乞川亿个勺久凡及夕丸么广亡门义之尸弓己已子卫也女飞刃习叉马乡丰王井开夫天无元专云扎艺木五支厅不太犬区历尤友匹车巨牙屯比互切瓦止少日中冈贝内水见午牛手毛气升长仁什片仆化仇币仍仅斤爪反介父从今凶分乏公仓月氏勿欠风丹匀乌凤勾文六方火为斗忆计订户认心尺引丑巴孔队办以允予劝双书幻玉刊示末未击打巧正扑扒功扔去甘世古节本术可丙左厉右石布龙平灭轧东卡北占业旧帅归且旦目叶甲申叮电号田由史只央兄叼叫另叨叹四生失禾丘付仗代仙们仪白仔他斥瓜乎丛令用甩印乐句匆册犯外处冬鸟务包饥主市立闪兰半汁汇头汉宁穴它讨写让礼训必议讯记永司尼民出辽奶奴加召皮边发圣对台矛纠母幼丝式刑动扛寺吉扣考托老执巩扩扫地扬场耳共芒亚芝朽朴机权过臣再协西压厌在百存而页匠夸夺灰达列死成夹轨划迈毕至此贞师尘尖劣光当早吐吓虫曲团同吊吃因吸吗屿帆岁回岂则刚网肉年朱先丢舌竹迁乔伟传乒乓休伍伏优伐延件任伤价份体何但伸作伯伶佣低你住位伴身皂近彻役返余希坐谷妥含邻岔肝肚肠龟免狂犹角删条卵岛迎饭饮系言冻状亩况床库疗应冷这序辛弃冶忘闲间闷判灶灿弟汪沙汽沃泛沧没沟沪沈沉怀忧快完宋宏牢究穷灾良证启评补初社识诉诊词译君灵即层尿尾迟局改张忌际陆阿陈阻附妙妖妨努忍劲鸡驱纯纱纲纳驳纷纸纹纺驴纽寿弄麦形进戒吞远违运扶抚坛技坏扰拒找批扯走抄坝贡攻赤折抓扮抢孝均抛投坟抗坑坊抖护壳志块扭声把报却劫芽花芹芬苍芳严芦劳克苏杆杠杜材村杏极李杨求更束豆两丽医辰励否还来连步坚旱盯呈时助县里呆园围呀吨足邮男困吵串员听吹呜吧呕吼财针钉告我乱利秃秀私每兵估体何佐依停借赁储',
      },
    }),
  ])
}

init()
