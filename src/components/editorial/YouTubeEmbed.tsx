import styles from './adReviews.module.css';

export default function YouTubeEmbed({ title, videoId }: { title: string; videoId: string }) {
  return (
    <div className={styles.videoFrame}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
