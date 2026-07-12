import ActiveSelection from "../shapes/active_selection";
import type Board from "../board";
import Rect from "../shapes/rect";
import Pointer from "./point";
import type Shape from "../shapes/shape";
import SimplePath from "../shapes/paths/simple_path";
import Ellipse from "../shapes/ellipse";
import Text from "../shapes/text";
import Path from "../shapes/paths/path";
import SvgShape from "../shapes/svg_shape";
import ImageShape from "../shapes/image_shape";
import PlainLine from "../shapes/line/line-plain";
import AnchorLine from "../shapes/line/line-anchor-2";
import LineCurve from "../shapes/line/line-curve";
import Group from "../shapes/group";
import ExcalidrawShape from "../shapes/excalidraw_shape";
import LineShape from "../shapes/line/line_shape";
import type { ActiveSeletionProps } from "../shapes/active_selection";
import type { PathProps } from "../shapes/paths/path";
import type { ActiveSelectionShape } from "../shapes/shape_types";
import type { Identity } from "../types";

export function generateShapeByShapeType(
    val: Identity<Shape & ActiveSeletionProps & PathProps>,
    board: Board,
    ctx: CanvasRenderingContext2D,
): Shape | null {
    if (!val) return null;
    if (val.type === "rect") {
        return new Rect({
            ...val,
            _board: board,
            ctx,
        });
    } else if (val.type === "selection") {
        if (!val.shapes || val.shapes.length == 0) return null;
        const shapes: ActiveSelectionShape[] = [];
        val.shapes.forEach((s: Identity<Shape>) => {
            const newS = generateShapeByShapeType(s, board, ctx);
            if (!newS) return;
            shapes.push({
                s: newS,
                offset: new Pointer({
                    x: newS.left - val.left,
                    y: newS.top - val.top,
                }),
            });
        });

        if (!shapes.length) return null;

        return new ActiveSelection({
            shapes: shapes,
            _board: board,
            ctx: ctx,
            width: val.width,
            height: val.height,
            left: val.left,
            top: val.top,
        });
    } else if (val.type === "group") {
        if (!val.shapes || val.shapes.length === 0) return null;
        const groupShapes = (val.shapes as Identity<Shape>[])
            .map((s) => {
                const newS = generateShapeByShapeType(s, board, ctx);
                return newS ? { s: newS, oldProps: (s as any).oldProps } : null;
            })
            .filter(Boolean) as { s: Shape; oldProps?: any }[];
        if (!groupShapes.length) return null;
        const group = new Group({
            ...val,
            shapes: groupShapes,
            _board: board,
            ctx,
        });
        // Restore member shapes into shapeStore with their groupId
        groupShapes.forEach(({ s }) => {
            s.groupId = group.ID();
            board.shapeStore.insert(s);
        });
        return group;
    } else if (val.type === "path") {
        if (val.pathType === "simplePath") {
            return new SimplePath({
                ...val,
                ctx,
                _board: board,
            });
        }
        // Fallback: restore as base Path (pentagon, triangle, star, etc.)
        return new Path({
            ...val,
            ctx,
            _board: board,
        });
    } else if (val.type === "ellipse") {
        return new Ellipse({
            ...val,
            _board: board,
            ctx: ctx,
        });
    } else if (val.type === "line" && (val as any).lineshape) {
        return new LineShape({
            ...val,
            _board: board,
            ctx,
            points: (val as any).points,
            linetype: (val as any).linetype,
            arrow: (val as any).arrow,
            arrowtype: (val as any).arrowtype,
            attached: (val as any).attached,
        });
    } else if (val.type === "line") {
        const lineType = (val as any).lineType || "straight";
        if (lineType === "anchor") {
            return new AnchorLine({
                ...val,
                _board: board,
                ctx,
                points: (val as any).points,
                lineType: "anchor",
            });
        } else if (lineType === "curve") {
            return new LineCurve({
                ...val,
                _board: board,
                ctx,
                points: (val as any).points,
                lineType: "curve",
            });
        } else {
            return new PlainLine({
                ...val,
                _board: board,
                ctx,
                points: (val as any).points,
                lineType: "straight",
            });
        }
    } else if (val.type === "text") {
        return new Text({
            ...val,
            _board: board,
            ctx: ctx,
        });
    } else if (val.type === "svg") {
        return new SvgShape({
            ...val,
            _board: board,
            ctx: ctx,
        });
    } else if (val.type === "image") {
        return new ImageShape({
            ...val,
            _board: board,
            ctx: ctx,
        });
    } else if (val.type === "excalidraw") {
        return new ExcalidrawShape({
            ...val,
            _board: board,
            ctx: ctx,
            elements: (val as any).elements,
        });
    }
    return null;
}
