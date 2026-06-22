import { DataSource } from 'typeorm';

export interface CommentNode {
  id: number;
  parent_id: number | null;
  user_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
  user: { id: number; name: string; email: string } | null;
  likes_count: number;
  replies: CommentNode[];
}

export class TaskCommentsHelper {
  static async fetchNestedComments(
    dataSource: DataSource,
    taskId: number,
  ): Promise<CommentNode[]> {
    const rows: unknown = await dataSource.query(
      `
      WITH RECURSIVE comment_tree AS (
        SELECT
          c.*,
          json_build_object('id', u.id, 'name', u.name, 'email', u.email) as user,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.task_id = $1 AND c.parent_id IS NULL
        UNION ALL
        SELECT
          c.*,
          json_build_object('id', u.id, 'name', u.name, 'email', u.email) as user,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        JOIN comment_tree ct ON ct.id = c.parent_id
      )
      SELECT
        *,
        (SELECT json_agg(json_build_object(
          'id', cl.id,
          'userId', cl.user_id,
          'createdAt', cl.created_at
        )) FROM comment_likes cl WHERE cl.comment_id = comment_tree.id) as likes
      FROM comment_tree;
    `,
      [taskId],
    );
    const comments = rows as CommentNode[];

    const commentsMap = new Map<number, CommentNode>();
    const topLevelComments: CommentNode[] = [];

    comments.forEach((comment) => {
      comment.replies = [];
      commentsMap.set(comment.id, comment);
      if (comment.parent_id) {
        const parent = commentsMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });

    return topLevelComments;
  }

  static async fetchActivityLogs(
    dataSource: DataSource,
    taskId: number,
  ): Promise<unknown[]> {
    const rows: unknown = await dataSource.query(
      `
      SELECT
        al.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as user
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.task_id = $1
      ORDER BY al.created_at DESC
      LIMIT 50
    `,
      [taskId],
    );
    return rows as unknown[];
  }
}
