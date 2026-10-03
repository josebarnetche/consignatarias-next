import type { ComponentProps, ImgHTMLAttributes } from 'react'
import Image from 'next/image'
import { srcClaro } from '@/lib/ui/marca-claro'

export { srcClaro }

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null }

/**
 * <img> que respeta el tema. La identidad de marca se dibujó para el terminal
 * oscuro (xilografías blancas sobre negro, renders nocturnos, íconos mono blancos);
 * en el tema claro se muestra la variante "-claro" (tinta sobre papel, niebla,
 * acento azul). Las dos van en el HTML — el tema se elige antes de pintar con
 * <html data-theme>, sin JS — y CSS oculta la que no corresponde (.solo-claro /
 * .solo-oscuro en globals.css). Las dos van con loading="lazy" (salvo la clara
 * de una cabecera con fetchPriority="high"): una imagen lazy con display:none
 * nunca se descarga, así que cada visitante baja solo las de su tema. Sin
 * variante conocida (logos de terceros, etc.) es un <img> común.
 */
export function ImagenTema({ src, loading, className, ...rest }: Props) {
  const claro = srcClaro(src)
  // Lazy por defecto también la clara: así en el oscuro tampoco se descarga. Las
  // imágenes de cabecera (fetchPriority="high") quedan inmediatas.
  const loadingClaro = loading ?? (rest.fetchPriority === 'high' ? undefined : 'lazy')
  if (!claro) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src ?? undefined} loading={loading} className={className} {...rest} />
  }
  const cls = (extra: string) => (className ? `${className} ${extra}` : extra)
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={claro} loading={loadingClaro} className={cls('solo-claro')} {...rest} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={src ?? undefined} loading="lazy" className={cls('solo-oscuro')} {...rest} />
    </>
  )
}

/** Lo mismo para next/image. La oscura pierde `priority` y va lazy. */
export function ImageTema({ src, alt, className, priority, ...rest }: ComponentProps<typeof Image> & { src: string }) {
  const claro = srcClaro(src)
  if (!claro) return <Image src={src} alt={alt} className={className} priority={priority} {...rest} />
  const cls = (extra: string) => (className ? `${className} ${extra}` : extra)
  return (
    <>
      <Image src={claro} alt={alt} className={cls('solo-claro')} priority={priority} {...rest} />
      <Image src={src} alt={alt} className={cls('solo-oscuro')} loading="lazy" {...rest} />
    </>
  )
}

type Fuente = { srcSet: string; media?: string; type?: string }

/**
 * Lo mismo para un <picture> con fuentes por tamaño/formato (la foto de cabecera
 * de la home). Cada <source> también pasa a su -claro.
 */
export function PictureTema({ fuentes, src, alt = '', loading, className, ...rest }: Props & { fuentes: Fuente[]; src: string }) {
  const claro = srcClaro(src)
  const pic = (variante: 'claro' | 'oscuro') => {
    const v = (u: string) => (variante === 'claro' ? srcClaro(u) ?? u : u)
    return (
      <picture className={claro ? (variante === 'claro' ? 'solo-claro' : 'solo-oscuro') : undefined}>
        {fuentes.map((f) => (
          <source key={f.srcSet} srcSet={v(f.srcSet)} media={f.media} type={f.type} />
        ))}
        <img
          src={v(src)}
          alt={alt}
          loading={variante === 'oscuro' && claro ? 'lazy' : loading}
          className={className}
          {...rest}
          {...(variante === 'oscuro' && claro ? { fetchPriority: 'low' as const } : {})}
        />
      </picture>
    )
  }
  if (!claro) return pic('oscuro')
  return (
    <>
      {pic('claro')}
      {pic('oscuro')}
    </>
  )
}

export default ImagenTema
