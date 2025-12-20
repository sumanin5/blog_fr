import { Card, CardContent } from "@/shared/components/ui/card";

/**
 * 🧪 卡片继承测试组件
 *
 * 测试不同情况下h3元素的颜色继承问题
 */
export default function CardTest() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">卡片颜色继承测试</h1>

      {/* 测试 1: Card 没有颜色类，CardContent 有 text-foreground */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          测试 1: CardContent 有 text-foreground
        </h2>
        <Card className="my-6">
          <CardContent className="text-foreground p-6">
            <h3 className="mb-2 text-xl font-bold">这是测试标题 1</h3>
            <div className="">这是测试内容，看看h3和div的颜色是否正常。</div>
          </CardContent>
        </Card>
      </section>

      {/* 测试 2: Card 有 text-foreground，CardContent 没有 */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          测试 2: Card 有 text-foreground
        </h2>
        <Card className="text-foreground my-6">
          <CardContent className="p-6">
            <h3 className="mb-2 text-xl font-bold">这是测试标题 2</h3>
            <div className="">这是测试内容，看看h3和div的颜色是否正常。</div>
          </CardContent>
        </Card>
      </section>

      {/* 测试 3: 都没有颜色类 */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">测试 3: 都没有颜色类</h2>
        <Card className="my-6">
          <CardContent className="p-6">
            <h3 className="mb-2 text-xl font-bold">这是测试标题 3</h3>
            <div className="">这是测试内容，看看h3和div的颜色是否正常。</div>
          </CardContent>
        </Card>
      </section>

      {/* 测试 4: h3 直接加 text-foreground */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          测试 4: h3 直接加 text-foreground
        </h2>
        <Card className="my-6">
          <CardContent className="p-6">
            <h3 className="text-foreground mb-2 text-xl font-bold">
              这是测试标题 4
            </h3>
            <div className="">这是测试内容，看看h3和div的颜色是否正常。</div>
          </CardContent>
        </Card>
      </section>

      {/* 测试 5: 原生 div 包装测试 */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          测试 5: 原生 div 包装 (对照组)
        </h2>
        <div className="bg-card text-card-foreground my-6 rounded-xl border p-6 shadow-sm">
          <h3 className="mb-2 text-xl font-bold">这是原生div中的标题</h3>
          <div className="">这是原生div中的内容，用来对比。</div>
        </div>
      </section>

      {/* 测试 6: 强制白色测试 */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          测试 6: 强制白色 (验证显示)
        </h2>
        <Card className="my-6">
          <CardContent className="p-6">
            <h3 className="mb-2 text-xl font-bold text-white">
              这是强制白色的标题
            </h3>
            <div className="text-white">
              这是强制白色的内容，如果能看到说明不是渲染问题。
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
