import { fonts } from 'modern-font'
import {
  Element2D,
  Engine,
  Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/fallback.woff' })

  engine.root.append([
    new Element2D({
      style: {
        fontSize: 20,
        left: 100,
        top: 100,
        width: 800,
      },
      text: {
        content: '一乙二十丁厂七卜人入八九几儿了力乃刀又三干亏士工土才寸下丈与万上小口巾山千乞川亿个勺久凡及夕丸么广亡门义之尸弓己已子卫也女飞刃习叉马乡丰王井开夫天无元专云扎艺木五支厅不太犬区历尤友匹车巨牙屯比互切瓦止少日中冈贝内水见午牛手毛气升长仁什片仆化仇币仍仅斤爪反介父从今凶分乏公仓月氏勿欠风丹匀乌凤勾文六方火为斗忆计订户认心尺引丑巴孔队办以允予劝双书幻玉刊示末未击打巧正扑扒功扔去甘世古节本术可丙左厉右石布龙平灭轧东卡北占业旧帅归且旦目叶甲申叮电号田由史只央兄叼叫另叨叹四生失禾丘付仗代仙们仪白仔他斥瓜乎丛令用甩印乐句匆册犯外处冬鸟务包饥主市立闪兰半汁汇头汉宁穴它讨写让礼训必议讯记永司尼民出辽奶奴加召皮边发圣对台矛纠母幼丝式刑动扛寺吉扣考托老执巩扩扫地扬场耳共芒亚芝朽朴机权过臣再协西压厌在百存而页匠夸夺灰达列死成夹轨划迈毕至此贞师尘尖劣光当早吐吓虫曲团同吊吃因吸吗屿帆岁回岂则刚网肉年朱先丢舌竹迁乔伟传乒乓休伍伏优伐延件任伤价份体何但伸作伯伶佣低你住位伴身皂近彻役返余希坐谷妥含邻岔肝肚肠龟免狂犹角删条卵岛迎饭饮系言冻状亩况床库疗应冷这序辛弃冶忘闲间闷判灶灿弟汪沙汽沃泛沧没沟沪沈沉怀忧快完宋宏牢究穷灾良证启评补初社识诉诊词译君灵即层尿尾迟局改张忌际陆阿陈阻附妙妖妨努忍劲鸡驱纯纱纲纳驳纷纸纹纺驴纽寿弄麦形进戒吞远违运扶抚坛技坏扰拒找批扯走抄坝贡攻赤折抓扮抢孝均抛投坟抗坑坊抖护壳志块扭声把报却劫芽花芹芬苍芳严芦劳克苏杆杠杜材村杏极李杨求更束豆两丽医辰励否还来连步坚旱盯呈时助县里呆园围呀吨足邮男困吵串员听吹呜吧呕吼财针钉告我乱利秃秀私每兵估体何佐依停借赁储',
      },
    }),
  ])
}

init()
