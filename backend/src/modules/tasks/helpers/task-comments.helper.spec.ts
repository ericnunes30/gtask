import { DataSource } from 'typeorm';
import { TaskCommentsHelper } from './task-comments.helper';

const mockDataSource = {
  query: jest.fn(),
} as unknown as jest.Mocked<DataSource>;

describe('TaskCommentsHelper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchNestedComments', () => {
    it('should call dataSource.query with SQL containing WITH RECURSIVE', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await TaskCommentsHelper.fetchNestedComments(
        mockDataSource,
        1,
      );

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        [1],
      );
      expect(result).toEqual([]);
    });

    it('should build comment tree from flat results', async () => {
      const date = new Date();
      const mockComments = [
        {
          id: 1,
          parent_id: null,
          user_id: 1,
          content: 'Top',
          created_at: date,
          updated_at: date,
          user: { id: 1, name: 'User', email: 'user@example.com' },
          likes_count: 0,
          replies: [],
        },
        {
          id: 2,
          parent_id: 1,
          user_id: 2,
          content: 'Reply',
          created_at: date,
          updated_at: date,
          user: { id: 2, name: 'User2', email: 'user2@example.com' },
          likes_count: 0,
          replies: [],
        },
      ];

      mockDataSource.query.mockResolvedValue(mockComments);

      const result = await TaskCommentsHelper.fetchNestedComments(
        mockDataSource,
        1,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe(2);
      expect(result[0].replies[0].content).toBe('Reply');
    });

    it('should not include orphan reply whose parent is not in the map', async () => {
      const date = new Date();
      const mockComments = [
        {
          id: 1,
          parent_id: null,
          user_id: 1,
          content: 'Top',
          created_at: date,
          updated_at: date,
          user: { id: 1, name: 'User', email: 'user@example.com' },
          likes_count: 0,
          replies: [],
        },
        {
          id: 3,
          parent_id: 999, // parent does not exist in map
          user_id: 3,
          content: 'Orphan',
          created_at: date,
          updated_at: date,
          user: { id: 3, name: 'User3', email: 'user3@example.com' },
          likes_count: 0,
          replies: [],
        },
      ];

      mockDataSource.query.mockResolvedValue(mockComments);

      const result = await TaskCommentsHelper.fetchNestedComments(
        mockDataSource,
        1,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].replies).toHaveLength(0);
    });
  });

  describe('fetchActivityLogs', () => {
    it('should call dataSource.query with SQL containing activity_logs', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await TaskCommentsHelper.fetchActivityLogs(
        mockDataSource,
        1,
      );

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('activity_logs'),
        [1],
      );
      expect(result).toEqual([]);
    });

    it('should return array of activity logs', async () => {
      const mockLogs = [{ id: 1, action: 'created' }];
      mockDataSource.query.mockResolvedValue(mockLogs);

      const result = await TaskCommentsHelper.fetchActivityLogs(
        mockDataSource,
        1,
      );

      expect(result).toEqual(mockLogs);
    });
  });
});
