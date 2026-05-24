import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getLoginCarousel } from '/@/api/sys/user';

export interface CarouselItem {
  icon: string;
  /** 支持 HTML 富文本 */
  text: string;
}

const DEFAULT_CAROUSEL: CarouselItem[] = [
  { icon: '✦', text: '志所趋,无远勿界 <br/>穷山巨海,不能限也' },
  { icon: '◆', text: '知止而后有定<br/>定而后能静' },
  { icon: '◈', text: '博观而约取<br/>厚积而薄发' },
  { icon: '◇', text: '流水不争先<br/>争的是滔滔不绝' },
  { icon: '▣', text: '行远自述<br/>登高自卑' },
];

export function useLoginCarousel() {
  const items = ref<CarouselItem[]>([...DEFAULT_CAROUSEL]);
  const currentIdx = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const currentItem = computed(() => items.value[currentIdx.value] ?? items.value[0]);

  async function fetchCarousel() {
    try {
      const data = await getLoginCarousel();
      if (data && Array.isArray(data) && data.length > 0) {
        items.value = data;
      }
    } catch {
      // 后端不可用时使用默认文案
    }
  }

  function startRotation(interval = 4000) {
    stopRotation();
    timer = setInterval(() => {
      currentIdx.value = (currentIdx.value + 1) % items.value.length;
    }, interval);
  }

  function stopRotation() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function switchTo(idx: number) {
    if (idx >= 0 && idx < items.value.length) {
      currentIdx.value = idx;
      startRotation();
    }
  }

  onMounted(() => {
    fetchCarousel();
    startRotation();
  });

  onUnmounted(() => {
    stopRotation();
  });

  return {
    items,
    currentIdx,
    currentItem,
    switchTo,
  };
}
