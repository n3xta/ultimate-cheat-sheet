export const SAMPLES = {
  prob: {
    label: '概率论与数理统计',
    text: `# 概率论与数理统计 · 期末小抄
## 1 概率基础
- P(A∪B) = P(A) + P(B) - P(AB)；P(A-B) = P(A) - P(AB)
- 条件概率 P(A|B) = P(AB)/P(B)，P(B)>0
- 乘法公式 P(AB) = P(A)P(B|A)；P(ABC) = P(A)P(B|A)P(C|AB)
- !!全概率!!：P(B) = Σ P(Ai)P(B|Ai)，{Ai} 是样本空间的划分
- ==Bayes==：P(Ai|B) = P(Ai)P(B|Ai) / Σ P(Aj)P(B|Aj)
- 独立 <=> P(AB) = P(A)P(B)；两两独立 ≠ 相互独立
- A,B 独立 -> A 与 B的对立事件 也独立
- 排列 A(n,k) = n!/(n-k)!，组合 C(n,k) = n!/(k!(n-k)!)
- 古典概型 P = 有利样本点数 / 总样本点数；几何概型 = 长度/面积之比
> 先验 × 似然 ∝ 后验。题里出现"已知……发生了" -> 条件概率 / Bayes！
## 2 离散分布
- 两点 B(1,p)：E = p，Var = p(1-p)
- 二项 B(n,p)：P(X=k) = C(n,k) p^k (1-p)^(n-k)，E = np，Var = np(1-p)
- 泊松 P(λ)：P(X=k) = λ^k e^(-λ) / k!，==E = Var = λ==
- n 大 p 小 -> B(n,p) ≈ P(np)（泊松近似，np 适中）
- 几何 G(p)：P(X=k) = (1-p)^(k-1) p，E = 1/p，Var = (1-p)/p²，__无记忆性__
- 超几何 H(N,M,n)：P(X=k) = C(M,k)C(N-M,n-k)/C(N,n)，E = nM/N
- 可加性：B(n1,p)+B(n2,p) = B(n1+n2,p)；P(λ1)+P(λ2) = P(λ1+λ2)（独立）
## 3 连续分布
- 均匀 U(a,b)：f = 1/(b-a)，E = (a+b)/2，Var = (b-a)²/12
- 指数 E(λ)：f = λe^(-λx)，x>0；F = 1 - e^(-λx)；E = 1/λ，Var = 1/λ²
- 指数分布也无记忆：P(X>s+t | X>s) = P(X>t)
- 正态 N(μ,σ²)：f = 1/(√(2π)σ) · e^(-(x-μ)²/(2σ²))
- 标准化 Z = (X-μ)/σ ~ N(0,1)；Φ(-x) = 1 - Φ(x)，Φ(0) = 0.5
- ==3σ 原则==：P(|X-μ|<σ) ≈ 0.6827，2σ ≈ 0.9545，3σ ≈ 0.9973
- 常用：Φ(1.645) = 0.95，Φ(1.96) = 0.975，Φ(2.33) ≈ 0.99，Φ(2.576) = 0.995
- 密度性质：f ≥ 0，∫ f(x) dx = 1；P(a<X≤b) = F(b) - F(a)
## 4 随机变量的函数
- 离散：直接列表合并同值概率
- Y = g(X)，g 严格单调：f_Y(y) = f_X(h(y)) · |h′(y)|，h 是 g 的反函数
- !!不单调!! -> 先求 F_Y(y) = P(g(X) ≤ y)，再求导（万能方法）
- X ~ N(μ,σ²) -> aX+b ~ N(aμ+b, a²σ²)
- X ~ U(0,1) -> -ln(X)/λ ~ E(λ)
## 5 多维随机变量
- 联合分布 F(x,y) = P(X≤x, Y≤y)
- 边缘密度 f_X(x) = ∫ f(x,y) dy，f_Y(y) = ∫ f(x,y) dx
- 独立 <=> f(x,y) = f_X(x) f_Y(y)（处处成立）
- 条件密度 f(y|x) = f(x,y) / f_X(x)
- Z = X+Y：f_Z(z) = ∫ f(x, z-x) dx（独立时就是卷积）
- 独立时：F_max = F_X·F_Y；F_min = 1 - (1-F_X)(1-F_Y)
- min 个独立指数：E(λ1)、E(λ2) 的 min ~ E(λ1+λ2)
- 独立正态之和：X+Y ~ N(μ1+μ2, σ1²+σ2²)
- 二维正态：不相关 <=> 独立（只有正态才这样！）
## 6 数字特征
- E(X) = Σ x p(x) 或 ∫ x f(x) dx；E(g(X)) = ∫ g(x) f(x) dx
- E(aX+bY) = aEX + bEY（永远成立，不需要独立）
- 独立 -> E(XY) = EX · EY
- Var(X) = E(X²) - (EX)²；Var(aX+b) = a²Var(X)
- Var(X±Y) = VarX + VarY ± 2Cov(X,Y)
- Cov(X,Y) = E(XY) - EX·EY；Cov(aX,bY) = ab·Cov(X,Y)
- ρ = Cov(X,Y) / (σX σY)，|ρ| ≤ 1，|ρ|=1 <=> 线性关系
- !!不相关 ≠ 独立!!（独立 -> 不相关，反之不一定）
- 马尔可夫：P(X ≥ a) ≤ E(X)/a（X ≥ 0）
- 切比雪夫：P(|X-EX| ≥ ε) ≤ Var(X)/ε²
## 7 大数定律与中心极限定理
- 切比雪夫 LLN：独立、方差有界 -> 样本均值依概率收敛到期望
- 辛钦：iid 且 EX = μ 存在 -> X\u0304 依概率收敛到 μ（不要求方差）
- 伯努利：频率 -> 概率
- ==中心极限定理==：iid，Σ Xi 近似 N(nμ, nσ²)
- 标准化：(Σ Xi - nμ) / (√n σ) 近似 N(0,1)
- 棣莫弗-拉普拉斯：B(n,p) 近似 N(np, np(1-p))
> 题型："n 很大 + 求至少/至多……的概率" -> CLT，标准化后查 Φ 表
## 8 统计量与抽样分布
- 样本均值 X\u0304 = (1/n) Σ Xi；样本方差 S² = 1/(n-1) · Σ (Xi - X\u0304)²
- E(X\u0304) = μ，Var(X\u0304) = σ²/n，E(S²) = σ²（所以分母是 n-1）
- χ²(n) = Z1² + … + Zn²，E = n，Var = 2n，可加
- t(n) = Z / √(χ²(n)/n)，关于 0 对称，n 很大时近似 N(0,1)
- F(m,n) = (χ²(m)/m) / (χ²(n)/n)；1/F ~ F(n,m)
- 正态总体：X\u0304 ~ N(μ, σ²/n)；(n-1)S²/σ² ~ χ²(n-1)；X\u0304 与 S² 独立
- (X\u0304 - μ) / (S/√n) ~ t(n-1)
- 上分位点：F(m,n) 的 1-α 分位 = 1 / F(n,m) 的 α 分位
## 9 参数估计
- 矩估计：令样本矩 = 总体矩，解出参数
- 极大似然 MLE：L(θ) = Π f(xi; θ) -> 取 ln -> 求导令其 = 0 -> 解
- 求导没零点 / 端点 -> 看单调性，取边界（比如 U(0,θ) 的 θ\u0302 = max Xi）
- MLE 不变性：g(θ) 的 MLE = g(θ\u0302)
- __无偏__ E(θ\u0302) = θ；__有效__ 方差更小；__相合__ θ\u0302 依概率 -> θ
- μ 的区间，σ 已知：X\u0304 ± z(α/2) · σ/√n
- μ 的区间，σ 未知：X\u0304 ± t(α/2)(n-1) · S/√n
- σ² 的区间：[(n-1)S² / χ²(α/2)(n-1)，(n-1)S² / χ²(1-α/2)(n-1)]
- 两均值差，σ1、σ2 已知：(X\u0304 - Y\u0304) ± z(α/2) · √(σ1²/n1 + σ2²/n2)
## 10 假设检验
- H0 vs H1；α = P(拒绝 H0 | H0 为真) = 第一类错误（弃真）
- β = P(接受 H0 | H0 为假) = 第二类错误（取伪）；n 固定时 α↓ 则 β↑
- 步骤：写假设 -> 选统计量 -> 定拒绝域 -> 代入算值 -> 下结论
- Z 检验（σ 已知）：|Z| > z(α/2) 拒绝；t 检验（σ 未知）：|T| > t(α/2)(n-1)
- χ² 检验（方差）：(n-1)S²/σ0²；F 检验（两方差比）：S1²/S2²
- p 值 < α -> 拒绝 H0
> 别忘了：双侧用 α/2，单侧用 α！结论要写回题目语境："在 α=0.05 下认为……"
## 11 二维正态与协方差矩阵
- (X,Y) ~ N(μ1, μ2, σ1², σ2², ρ)：边缘是正态，条件分布也是正态
- aX+bY 仍是正态：E = aμ1 + bμ2，Var = a²σ1² + b²σ2² + 2abρσ1σ2
- E(Y|X=x) = μ2 + ρ(σ2/σ1)(x - μ1)，就是回归直线
- 协方差矩阵：对称、半正定，对角线是各自方差
- Cov(X, X) = Var(X)；Cov(X+Y, Z) = Cov(X,Z) + Cov(Y,Z)
## 12 积分与求和技巧
- ∫ x^n e^(-x) dx（0 到 ∞）= n!，Γ(n+1) = nΓ(n)，Γ(1/2) = √π
- ∫ e^(-x²/2) dx（整条实轴）= √(2π)
- Σ λ^k / k! = e^λ；Σ k(1-p)^(k-1) p = 1/p；Σ q^k = 1/(1-q)
- **求 E(X²) 最快**：Var + (EX)² 反推，别硬积分
- 奇函数在对称区间上积分 = 0；指数族先把 λ 提出来再分部积分
## 13 常见题型
- 求常数 c：∫∫ f(x,y) dx dy = 1
- 求 P((X,Y) ∈ D)：先画区域，再定上下限，想清楚先积 x 还是先积 y
- 判断独立：f(x,y) 能拆成 g(x)h(y) **且** 区域是矩形
- 求 Z = X+Y：卷积或分布函数法，注意 z 的分段
- 求 E(max)：先 F_max，再求导，再积分
- MLE：写 ln L -> 求导；离散型就是概率连乘
- 证无偏：直接算期望；证相合：切比雪夫 + Var -> 0
- 区间估计：先判断 σ 已知还是未知、一个正态还是两个
---
- 考场：先做会的，Bayes 题先画树状图，积分上下限画图确认
- 带：计算器、2B 铅笔、准考证、~~手机~~ 水`,
  },
  algo: {
    label: 'Algorithms (English)',
    text: `# CS Algorithms Final · crib sheet
## Asymptotics
- 1 < log n < √n < n < n log n < n² < n³ < 2^n < n!
- f = O(g): f(n) ≤ c·g(n) for n ≥ n0. Ω = lower bound, Θ = both
- Master thm: T(n) = aT(n/b) + f(n), compare f with n^(log_b a)
1. f polynomially smaller -> Θ(n^(log_b a))
2. f same order -> Θ(n^(log_b a) · log n)
3. f bigger + regularity a·f(n/b) ≤ c·f(n) -> Θ(f(n))
- ==1+2+…+n = n(n+1)/2==, geometric Σ r^i = (r^(n+1) - 1)/(r - 1)
- log(n!) = Θ(n log n) by Stirling. Harmonic H_n = Θ(log n)
- Recursion tree: cost per level × number of levels, check the leaves!
## Sorting
- Insertion: O(n²) worst, O(n) nearly sorted, stable, in place
- Merge: Θ(n log n) always, stable, O(n) extra space
- Quick: avg O(n log n), worst O(n²) on bad pivots, in place, !!not stable!!
- Randomized pivot -> expected O(n log n) on every input
- Heap: O(n log n), in place, not stable. Build-heap is only O(n)
- Counting O(n + k), Radix O(d(n + k)): non-comparison, need small keys
- Comparison sorting lower bound Ω(n log n): decision tree has n! leaves
> Stable = equal keys keep their order. Merge, insertion, counting: stable. Quick, heap: not.
## Data structures
- Array: index O(1), insert/delete O(n). Linked list: insert O(1) given the node
- Stack LIFO, queue FIFO, deque both ends, all O(1)
- Binary heap: insert / extract-min O(log n), peek O(1). Children of i: 2i+1, 2i+2
- Hash table: expected O(1), worst O(n). Load factor α = n/m. Chaining vs open addressing
- BST ops O(h). Balanced (AVL, red-black): h = O(log n)
- __Red-black__: root black, no red-red, every root-leaf path has the same number of blacks
- AVL: |height(L) - height(R)| ≤ 1, fix with rotations
- Union-Find with union by rank + path compression: O(α(n)) amortized
- Trie: O(L) per word. Segment tree / Fenwick: range query + update O(log n)
## Graphs
- Adjacency list O(V + E) space, matrix O(V²)
- BFS: O(V + E), shortest paths in unweighted graphs, uses a queue
- DFS: O(V + E), discovery / finish times, edges: tree, back, forward, cross
- Directed graph has a cycle <=> DFS finds a back edge
- Topological sort: DFS by decreasing finish time, or Kahn's queue of in-degree 0. ==DAG only==
- SCC (Kosaraju): DFS, transpose the graph, DFS again in decreasing finish order. O(V + E)
- Bipartite <=> no odd cycle <=> BFS 2-colouring works
## Shortest paths
- relax(u, v): if d[v] > d[u] + w(u, v) then d[v] = d[u] + w(u, v), parent[v] = u
- Dijkstra: non-negative weights, O((V + E) log V) with a binary heap
- !!negative edge -> no Dijkstra!! Use Bellman-Ford O(VE)
- Bellman-Ford: V-1 rounds; if anything still relaxes -> negative cycle
- DAG: relax edges in topological order, O(V + E), negatives fine
- Floyd-Warshall, all pairs, O(V³): d[i][j] = min(d[i][j], d[i][k] + d[k][j])
## Minimum spanning tree
- Cut property: the lightest edge crossing any cut is safe
- Cycle property: the heaviest edge on a cycle is not in the MST (if unique)
- Kruskal: sort edges + union-find, O(E log E)
- Prim: grow from a root with a heap, O(E log V)
## Greedy vs dynamic programming
- Greedy proofs: exchange argument or "greedy stays ahead"
- Activity selection: pick the earliest finish time. Huffman: merge two lightest, O(n log n)
- DP needs optimal substructure + overlapping subproblems -> memo or table
- LCS: c[i][j] = c[i-1][j-1] + 1 if match, else max(c[i-1][j], c[i][j-1]). O(mn)
- 0/1 knapsack: K[i][w] = max(K[i-1][w], v_i + K[i-1][w - w_i]). O(nW), pseudo-polynomial
- Edit distance: d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + [a_i ≠ b_j])
- LIS: O(n²) DP, or O(n log n) with patience piles + binary search
- Matrix chain: m[i][j] = min over k of m[i][k] + m[k+1][j] + p(i-1)·p(k)·p(j)
> DP recipe: define the subproblem -> recurrence -> base cases -> fill order -> where the answer lives
## Flow and matching
- Max flow = min cut. Ford-Fulkerson O(E·|f*|), Edmonds-Karp (BFS paths) O(VE²)
- Residual graph: forward capacity c - f, backward f
- Bipartite matching -> unit-capacity flow from s to t
## NP-completeness
- P ⊆ NP. NP-hard: every NP problem reduces to it. NPC = NP ∩ NP-hard
- To show X is NPC: X ∈ NP, then reduce a KNOWN NPC problem -> X (direction matters!)
- Classics: SAT, 3-SAT, clique, vertex cover, independent set, Ham cycle, TSP, subset sum, 3-colouring
- ~~2-SAT is NP-complete~~ 2-SAT is in P (implication graph + SCC)
---
- Binary search: while lo <= hi, mid = lo + (hi - lo) / 2
- Amortized: aggregate, accounting, potential. Dynamic array push is O(1) amortized
- Quickselect expected O(n). Median of medians: worst case O(n)`,
  },
};
